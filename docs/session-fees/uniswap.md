# Session Fees — Uniswap Trading API integration (Arbitrum One)

How the fee-demo dapp applies wallet-declared `wc_feeTerms` as a Uniswap
Trading API integrator fee. Code:
`advanced/dapps/react-dapp-v2/src/helpers/uniswap.ts`, the proxy at
`src/pages/api/uniswap/[...path].ts`, and the Uniswap branch of
`src/pages/index.tsx`.

## ⚠️ Fee-gating status: unverified

The Trading API's OpenAPI spec contains a 401 error described as
*"Account is blocked or Fee is not enabled"* — the same wording pattern behind
1inch's silent gating. Whether a fresh self-serve key from
https://developers.uniswap.org/dashboard is fee-enabled is **unknown until
tested**: the quote response echoes `portionBips` / `portionAmount` /
`portionRecipient` when the fee is actually applied, so the first keyed quote
is the smoke test. If gated, the integration still works end to end — swaps
execute, no fee is collected — exactly like the 1inch leg.

## Flow

```
wallet ──(session approval)──▶ sessionProperties.wc_feeTerms
                                  { feeRecipientEip155, feeBps }
                                        │
dapp reads terms on settle              ▼
POST /v1/quote  { type: EXACT_INPUT, tokenIn: 0x000…000 (native), tokenOut: USDC,
                  amount, swapper, slippageTolerance, protocols: [V2,V3,V4],
                  integratorFees: [{ bips: <feeBps>, recipient: <recipient> }] }
        │ returns { routing: "CLASSIC", quote } — fee echoed as portionBips/Amount/Recipient
        ▼
POST /v1/swap   { quote }
        │ returns { swap: { to, from, data, value, gasLimit, … } }  (Universal Router)
        ▼
WalletConnect eth_sendTransaction → wallet signs & broadcasts
fee is paid to the recipient EOA inside the swap tx (PAY_PORTION, output token)
```

## Fee mechanics

- **Params:** `integratorFees: [{ bips, recipient }]` on `POST /quote` — one
  entry only, `bips` capped at **500 (5%)**, recipient is a plain EOA. The
  dapp maps `wc_feeTerms.feeBps → bips` and `feeRecipientEip155 → recipient`.
- The fee is always taken from the **output token** and disbursed inside the
  swap transaction via the Universal Router's `PAY_PORTION` pattern —
  Arbiscan-visible per swap, nothing to claim.
- **Quote math:** for `EXACT_INPUT` the quoted `output.amount` does **not**
  subtract the fee; the fee is reported separately in `portionAmount`. The
  dapp displays `output.amount − portionAmount` as "you receive".
- **Uniswap's cut:** none documented on the integrator fee.

## API access — key + proxy required

- `trade-api.gateway.uniswap.org/v1` requires an `x-api-key` header. The dapp
  proxies through `/api/uniswap/*` so the key stays server-side:
  `UNISWAP_API_KEY` in `.env.local` (no `NEXT_PUBLIC_`). Keys are free and
  self-serve at https://developers.uniswap.org/dashboard.
- The proxy whitelists `quote`, `swap`, `check_approval` only.
- Historical default rate limit ~3 rps — fine under the dapp's debounce.

## Transaction handling

- `protocols: ["V2","V3","V4"]` restricts routing to classic AMMs, which
  guarantees a **transaction-based** route. Without it the API may return a
  UniswapX (`DUTCH_*`) route — a gasless signed order, the wrong shape for the
  one-transaction demo.
- `/quote` requires a `swapper` address, so Uniswap quotes only appear once a
  wallet is connected (unlike the other aggregators).
- `/swap` takes the entire `quote` object from the quote response and returns
  a ready `swap` tx request (hex `value`/`gasLimit`), submitted as a standard
  `eth_sendTransaction` on `eip155:42161`.
- Selling native ETH (zero address) → no ERC-20 approval, one signature.

## Gotchas

- **`bips` is actual bps** (50 = 0.5%) — unlike 1inch's `fee` percent field.
- Pass the quote object to `/swap` **unmodified** — it's signed/validated
  server-side.
- Quotes go stale; the dapp re-quotes every 30 s and swaps from the displayed
  quote (Uniswap classic quotes tolerate this better than Kyber's
  pool-pinned routes; slippage tolerance covers the drift).
- If the fee is silently not applied (gating), `portionBips` will be missing
  from the quote response — the dapp's fee display shows "—" in that case
  rather than a fabricated number, since `portionAmount` is the source.
