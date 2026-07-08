# Session Fees POC — dapp ↔ wallet fee sharing over WalletConnect

A working end-to-end proof of concept: the **wallet declares fee terms** in the
WalletConnect session at approval, the **dapp reads them** and passes an
integrator fee into the Jupiter Swap API call that builds the transaction. The
fee is baked into the swap itself — no extra transaction, no second prompt, one
signature — and lands on a token account owned by the fee recipient, watchable
on Solscan.

- **Aggregator:** Jupiter Swap API V1 (`/swap/v1/quote` + `/swap/v1/swap`) —
  permissionless per-request integrator fees (`platformFeeBps` + `feeAccount`),
  no referral-program registration, no Jupiter cut on this path.
- **Chain / pair:** Solana mainnet, SOL → USDC.
- **Fee terms carrier:** `sessionProperties.wc_feeTerms` (JSON-encoded string):
  `{"version":1,"feeRecipient":"<Solana address>","feeBps":50}`.
- **Where fees land:** the fee recipient's **USDC associated token account**
  (derived by the dapp from `feeRecipient`), credited atomically inside every
  swap transaction.

## Apps

| App | Path | Port | Change |
|---|---|---|---|
| Demo wallet | `advanced/wallets/react-wallet-v2` | 3001 | Attaches `wc_feeTerms` to `sessionProperties` at session approval (`src/views/SessionProposalModal.tsx`). Signs requests exactly as before. |
| Fee-demo dapp | `advanced/dapps/react-dapp-v2` | 3000 | Landing page replaced with a single Jupiter-style swap screen (`src/pages/index.tsx`); Jupiter API client + fee-terms parsing in `src/helpers/jupiter.ts`. |

## Setup

Both apps use pnpm and run in dev mode (`pnpm dev`).

> **Node ≥22 note (pre-existing, not POC-related):** newer Node exposes a
> global `localStorage` on the server, which breaks the wallet's SSR guard in
> `SettingsStore`. Run the wallet with
> `NODE_OPTIONS=--no-experimental-webstorage pnpm dev`.

### Wallet (`advanced/wallets/react-wallet-v2/.env.local`)

```
NEXT_PUBLIC_PROJECT_ID=<your WalletConnect Cloud project id>
NEXT_PUBLIC_RELAY_URL=wss://relay.walletconnect.com
# Optional: override the fee recipient (defaults to the wallet's second
# Solana account, so fees land on an address you own but separate from the
# swapping account).
NEXT_PUBLIC_FEE_RECIPIENT=
NEXT_PUBLIC_FEE_BPS=50
```

The wallet generates two throwaway Solana keypairs on first run (persisted in
localStorage). Account 1 swaps — fund it with a few dollars of SOL. Account 2
collects fees by default — switch to it in the wallet's settings to see the
address, and initialize its USDC token account once (see below).

### Dapp (`advanced/dapps/react-dapp-v2/.env.local`)

```
NEXT_PUBLIC_PROJECT_ID=<your WalletConnect Cloud project id>
NEXT_PUBLIC_RELAY_URL=wss://relay.walletconnect.com
# Solana mainnet RPC for broadcasting swaps + reading the fee balance.
# Defaults to rpc.walletconnect.com; a dedicated RPC (e.g. Helius) is more reliable.
NEXT_PUBLIC_SOLANA_RPC_URL=
# Optional Jupiter API key (https://portal.jup.ag) — raises rate limits and
# switches from lite-api.jup.ag to api.jup.ag.
NEXT_PUBLIC_JUPITER_API_KEY=
NEXT_PUBLIC_JUPITER_API_BASE=
```

### Fee recipient token account (one-time)

Jupiter pays the integrator fee into the recipient's **USDC ATA**
(`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`). The ATA must already be
initialized — the easiest way is to send the recipient address a little USDC
once from any wallet/exchange. If it isn't initialized, Jupiter executes the
swap but **silently skips fee collection**; the dapp shows a warning when it
detects this.

## Demo script (~2 minutes)

1. Start both apps (`pnpm dev` in each). Open the dapp at
   `http://localhost:3000`, the wallet at `http://localhost:3001`.
2. **Connect** — click Connect in the dapp, scan/paste the URI into the wallet,
   approve. Point at the wallet's approval log / the dapp's "Session fee terms"
   card: the terms (`Fee 0.50% — 80% wallet / 20% WCN`, recipient address)
   came from the wallet via `sessionProperties.wc_feeTerms`.
3. **Swap** — enter a small SOL amount (e.g. 0.02). The quote shows the payout,
   the fee amount, and min received. Click Swap, approve the single signature
   prompt in the wallet.
4. **Watch the fee arrive** — on confirmation the dapp shows the tx hash with a
   Solscan link, and the "Fee recipient balance" card ticks up (it reads the
   USDC ATA live every 15s). Open the Solscan links to show the fee transfer
   inside the swap transaction and the growing balance.

## POC limitations (corners cut, by design)

- **No wallet-side fee verification.** The wallet declares terms and signs
  whatever arrives, exactly as today. A malicious dapp could ignore the terms.
- **No split contract.** Fees land on a single recipient; the
  "80% wallet / 20% WCN" split is a UI label only.
- **Fee recipient defaulting to the wallet's second account is POC-only
  convenience.** A real integration would declare a dedicated treasury
  address (or a split contract) as the recipient, not a user account.
- **No backend, attribution, or dashboard.** The "dashboard" is the live
  balance card + Solscan.
- **Static fee policy.** `feeBps` is hardcoded via env in the wallet; the dapp
  clamps it to 255 (Jupiter's on-chain `u8` cap for `platformFeeBps`).
- **One chain, one pair.** Solana mainnet, SOL → USDC only. Fee is taken in
  USDC (output token).
- **Fee account must pre-exist.** If the recipient's USDC ATA isn't
  initialized, Jupiter silently collects nothing (dapp shows a warning but
  doesn't create the account — that would add a second transaction).
- **Happy path only.** Minimal error handling: errors surface as toasts;
  no retry/timeout UX beyond a 90s confirmation window.
- **Jupiter API tier.** Keyless requests use `lite-api.jup.ag` (free, ~1 rps,
  scheduled for deprecation with no announced date). Set
  `NEXT_PUBLIC_JUPITER_API_KEY` to use `api.jup.ag`.
- **Wallet production build** (`next build`) fails with a pre-existing
  `localStorage` error unrelated to this POC — the wallet example is a
  dev-mode app; run it with `pnpm dev`.
- **0x (EVM) integration** is planned as the next step, not included here.
