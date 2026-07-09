# Session Fees — Jupiter integration (Solana)

How the fee-demo dapp applies wallet-declared `wc_feeTerms` as a Jupiter
integrator fee. Code: `advanced/dapps/react-dapp-v2/src/helpers/jupiter.ts` +
the Jupiter branch of `src/pages/index.tsx`.

## Flow

```
wallet ──(session approval)──▶ sessionProperties.wc_feeTerms
                                  { feeRecipient, feeBps }
                                        │
dapp reads terms on settle              ▼
GET  /swap/v1/quote   ?platformFeeBps=<feeBps>&inputMint=SOL&outputMint=USDC&amount=…
POST /swap/v1/swap    { quoteResponse, userPublicKey, feeAccount: <recipient's USDC ATA> }
        │ returns base64 versioned transaction (fee transfer already inside)
        ▼
WalletConnect solana_signTransaction { transaction } → wallet returns signed tx
dapp broadcasts via its own RPC, polls confirmation
fee lands on the recipient's USDC token account, same transaction
```

## Fee mechanics

- **Params:** `platformFeeBps` on `/quote` (integer bps) + `feeAccount` on
  `/swap`. Both must be present for fees to apply.
- **`feeAccount` is a token account, not a wallet address.** The dapp derives
  the recipient's USDC **associated token account** from
  `wc_feeTerms.feeRecipient` (`getAssociatedTokenAddress` in `jupiter.ts` —
  PDA derivation, no `@solana/spl-token` dependency).
- **The fee account must already be initialized.** If it doesn't exist, the
  swap executes normally and Jupiter **silently skips fee collection**. The
  dapp checks `getTokenAccountBalance` and shows a warning. Initialize it once
  by sending any dust amount of USDC to the recipient address.
- **Fee token = quote's input or output mint** (we use USDC, the output). The
  fee shows up in the quote response as `platformFee: { amount, feeBps }`.
- **Cap:** clamped to 255 bps in the dapp (`JUPITER_MAX_FEE_BPS`) — the v6
  on-chain program stores `platformFeeBps` as a `u8`.
- **Jupiter's cut: none** on this path. No registration or referral program
  needed since January 2025 — any valid token account works as `feeAccount`.

## API access

- Keyless: `https://lite-api.jup.ag` (~1 rps; host scheduled for deprecation,
  date TBA).
- With a free key from https://portal.jup.ag: set `NEXT_PUBLIC_JUPITER_API_KEY`
  and the client switches to `https://api.jup.ag` automatically
  (`NEXT_PUBLIC_JUPITER_API_BASE` overrides either).
- Browser CORS is allowed — no proxy needed (unlike 1inch).

## Transaction handling

- `/swap` returns `swapTransaction`: a **base64-encoded v0 (versioned)
  transaction**, priority fees and compute budget included
  (`dynamicComputeUnitLimit: true`, `prioritizationFeeLamports: "auto"`,
  `wrapAndUnwrapSol: true` — so native SOL works as input, no wSOL step).
- Sent to the wallet as `solana_signTransaction { transaction: <base64> }`.
  react-wallet-v2 deserializes with `VersionedTransaction.deserialize` and
  returns `{ transaction: <signed base64>, signature }`.
- The dapp broadcasts the signed transaction itself
  (`sendRawTransaction` against `NEXT_PUBLIC_SOLANA_RPC_URL`) and polls
  `getSignatureStatuses` until `confirmed`.

## Gotchas

- Wrong/missing fee ATA → fee silently dropped (see above). This is the #1
  demo failure mode.
- `/quote` + `/swap` are two calls; quotes go stale — the dapp re-quotes every
  30 s and swaps with the latest quote.
- The public Solana RPC (`api.mainnet-beta.solana.com`) rate-limits browsers;
  a dedicated RPC (Helius etc.) is more reliable for broadcasting.
- Jupiter V2 API (`/swap/v2/build`) is the forward path (same permissionless
  fee params, returns raw instructions instead of a serialized tx); V1 is
  still supported and simpler, so the POC uses V1.
