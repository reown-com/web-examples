# WDK Wallet Example

A minimal multi-chain web wallet that pairs **[Reown WalletKit](https://docs.reown.com/walletkit/overview)** (WalletConnect sign + Pay) with the **[Tether Wallet Development Kit (WDK)](https://docs.wdk.tether.io/)** for key handling.

One BIP‑39 seed phrase, managed entirely by WDK, derives accounts on **EVM**, **Solana**, and **TON**. WalletKit handles the WalletConnect transport: pairing, session proposals, signing requests, and WalletConnect Pay.

> This is a demo/reference app. The seed phrase is generated client‑side and stored in `localStorage` for convenience. **Do not use it as a real wallet.**

---

## Features

- **WDK key handling** — a single seed phrase derives EVM (BIP‑44), Solana (SLIP‑0010), and TON (BIP‑44, v5r1) accounts via WDK. Addresses are shown with copy buttons; the seed can be revealed.
- **WalletConnect sessions** — initialize WalletKit, pair from a `wc:` URI, approve/reject session proposals (namespaces built for all three chains), and disconnect active sessions.
- **Request signing** — approve/reject incoming `session_request`s, routed to the correct chain and signed with WDK‑derived keys.
- **WalletConnect Pay** — paste a Pay link to fetch payment options, pick one, sign the required actions, and confirm — fully client‑side, authenticated by your `projectId`.

---

## How it works

### 1. Key handling (WDK) — `src/lib/WDKWallet.ts`
On load, the app reads (or generates) a 24‑word seed phrase and instantiates three WDK wallet managers from it:

| Chain | WDK package | Derivation |
|-------|-------------|------------|
| EVM | `@tetherto/wdk-wallet-evm` | BIP‑44 `m/44'/60'/0'/0/0` |
| Solana | `@tetherto/wdk-wallet-solana` | SLIP‑0010 `m/44'/501'/0'/0'` |
| TON | `@tetherto/wdk-wallet-ton` | BIP‑44, `WalletContractV5R1` |

`getEvmAccount(chainId)`, `getSolanaAccount()`, and `getTonAccount()` expose the account (and its raw `keyPair`) used for signing.

### 2. WalletKit init & events — `src/utils/walletConnect.ts`, `src/hooks/*`
`createWalletKit()` boots WalletKit with the wallet metadata and `payConfig`. `useInitialization` loads accounts + WalletKit once; `useWalletConnectEventsManager` listens for `session_proposal`, `session_request`, and `session_delete`, opening the relevant modal.

### 3. Session approval — `src/utils/namespaces.ts`, `src/components/SessionProposalModal.tsx`
`buildApprovedNamespaces` intersects the dApp's proposal with the namespaces this wallet supports (EVM + Solana + TON, with the derived accounts) and approves or rejects.

### 4. Request handling — `src/utils/requestHandlers.ts`
`approveRequest` routes by namespace:

- **EVM** is served directly through WDK's account API.
- **Solana** and **TON** carry pre‑serialized payloads that WDK's high‑level API can't ingest, so they're bridged onto WDK's raw `keyPair` by small signers (`src/lib/solanaSigner.ts` using `@solana/web3.js`, `src/lib/tonSigner.ts` using `WalletContractV5R1`). The keys still come entirely from WDK.

### 5. WalletConnect Pay — `src/store/PaymentStore.ts`, `src/components/payment/*`
`isPaymentLink(uri)` detects Pay links. The flow is:

```
getPaymentOptions({ paymentLink, accounts })   // EVM + Solana accounts offered
  → user selects an option
  → getRequiredPaymentActions({ paymentId, optionId })
  → sign each action with the WDK-derived key
  → confirmPayment({ paymentId, optionId, signatures })
```

Signing is chain‑aware: EVM actions sign EIP‑712 typed data (token permits — e.g. EIP‑2612 for USDC, Permit2 for USDT), Solana actions sign through `SolanaSigner`. A first‑time on‑chain `approve` action (e.g. enabling Permit2) is broadcast via WDK and awaited before settlement. Options that require buyer data (KYC) open a hosted form in a popup (`CollectDataPopup`).

Pay runs entirely in the browser and authenticates with your `projectId` (`payConfig.appId`) — no API key or backend proxy.

---

## Supported chains & methods

**EVM** — Ethereum, Sepolia, Polygon, Base, Arbitrum
`personal_sign`, `eth_sign`, `eth_signTypedData[_v3|_v4]`, `eth_signTransaction`, `eth_sendTransaction`

**Solana** — Mainnet, Devnet
`solana_signMessage`, `solana_signTransaction`, `solana_signAndSendTransaction`, `solana_signAllTransactions`

**TON** — Mainnet, Testnet
`ton_sendMessage`, `ton_signData`

Chains and the advertised method lists live in `src/config/chains.ts`.

---

## Getting started

### Prerequisites
- Node.js 18+
- [pnpm](https://pnpm.io/)
- A WalletConnect/Reown **Project ID** — create one at [dashboard.reown.com](https://dashboard.reown.com)

### Setup

```bash
pnpm install
cp .env.local.example .env.local
# then set NEXT_PUBLIC_PROJECT_ID in .env.local
```

`.env.local`:

```bash
NEXT_PUBLIC_PROJECT_ID=your_project_id        # required
NEXT_PUBLIC_RELAY_URL=wss://relay.walletconnect.com   # optional
```

### Run

```bash
pnpm dev      # http://localhost:3002
pnpm build    # production build
pnpm start    # serve the production build on :3002
```

### Try it
1. Open the app — three accounts (EVM / Solana / TON) appear.
2. On any WalletConnect‑enabled dApp, copy its connection URI and paste it into **Connect a dApp or pay** → approve the session.
3. Trigger a signing request from the dApp → approve/reject it in the wallet.
4. To test Pay, paste a WalletConnect Pay link into the same input.

---

## Project structure

```
src/
  config/chains.ts            # project id, chains, advertised signing methods
  lib/
    WDKWallet.ts              # WDK key handling: seed → EVM/Solana/TON accounts
    solanaSigner.ts           # bridges WC Solana payloads onto the WDK key
    tonSigner.ts              # TON v5r1 sendMessage / signData via the WDK key
  utils/
    walletConnect.ts          # WalletKit init + payConfig
    namespaces.ts             # buildApprovedNamespaces for session approval
    requestHandlers.ts        # approve/reject session_requests per chain
  hooks/                      # initialization + WalletKit event wiring
  store/                      # valtio stores (Settings, Modal, Payment)
  components/                 # accounts UI, session/request modals, payment modal
  pages/                      # _app, index (single-page wallet)
```

---

## Architecture notes

- **WDK is the only key holder.** The Solana/TON signers don't derive or store keys — they read WDK's exposed `keyPair` and only translate WalletConnect's wire format into a signature. EVM never needs a bridge because WDK's EVM API maps cleanly onto the WalletConnect methods.
- **Browser polyfills** (`next.config.js`): a `Buffer` provide‑plugin, and `sodium-native` is aliased to `sodium-javascript` so WDK's memory‑safe key handling runs in the browser.
- **No backend.** Both WalletConnect signing and Pay run client‑side; there are no API routes and no server‑side secrets.

---

## Reference

This wallet is intentionally lean. For a much larger, multi‑chain reference wallet, see [`advanced/wallets/react-wallet-v2`](../react-wallet-v2) in this repo.
