# Session Fees — KyberSwap integration (Arbitrum One)

How the fee-demo dapp applies wallet-declared `wc_feeTerms` as a KyberSwap
Aggregator integrator fee. Code:
`advanced/dapps/react-dapp-v2/src/helpers/kyberswap.ts` and the KyberSwap
branch of `src/pages/index.tsx`.

KyberSwap is the **most permissionless EVM option we found**: no API key, no
registration, no fee cap documented, **no cut taken from the integrator fee**,
and browser CORS is open — so unlike 1inch there is no server-side proxy and
nothing to configure. (Verified end-to-end on Arbitrum mainnet 2026-07-09: tx
[`0xa4eb0d1c…88fbd`](https://arbiscan.io/tx/0xa4eb0d1c5da3ea6aeb43d7749aa07fc2ab65d5531346e257b347bf5ada588fbd)
paid exactly 50 bps of gross output to the fee recipient inside the swap, with
no Kyber cut — gross − fee = user amount to the digit.)

## Flow

```
wallet ──(session approval)──▶ sessionProperties.wc_feeTerms
                                  { feeRecipientEip155, feeBps }
                                        │
dapp reads terms on settle              ▼
GET  /arbitrum/api/v1/routes      ?tokenIn=ETH&tokenOut=USDC&amountIn=…
                                  &feeAmount=<feeBps>&chargeFeeBy=currency_out
                                  &isInBps=true&feeReceiver=<recipient>
        │ returns routeSummary (fee baked into extraFee, amountOut net of fee)
        ▼
POST /arbitrum/api/v1/route/build { routeSummary, sender, recipient, slippageTolerance }
        │ returns { data, routerAddress, transactionValue, gas }
        ▼
WalletConnect eth_sendTransaction → wallet signs & broadcasts
fee is paid to the recipient EOA inside the same swap transaction
```

## Fee mechanics

- **Params (on GET /routes):** `feeAmount` (bps when `isInBps=true`) +
  `chargeFeeBy` (`currency_in` | `currency_out`; we use `currency_out` so the
  fee is taken in USDC) + `feeReceiver` (plain EOA). They are baked into the
  returned `routeSummary.extraFee` and must ride along unchanged into
  `route/build`.
- **`amountOut` is already net of the fee**; the dapp backs the fee out for
  display (`out * feeBps / (10000 - feeBps)`).
- **Cap:** none documented (the API only rejects fee > amount); the dapp
  clamps defensively at 1000 bps (`KYBER_MAX_FEE_BPS`).
- **Kyber's cut: none.** 100% of the fee reaches `feeReceiver`, as a normal
  ERC-20 transfer inside the swap tx (Arbiscan-visible per swap). Note Kyber
  does keep **positive slippage** (execution better than quote accrues to
  Kyber) — separate from, and irrelevant to, the integrator fee.
- Recipient is a plain EOA — no token account setup, no initialization.

## API access — none required

- Base URL `https://aggregator-api.kyberswap.com/{chain}/api/v1` (chain by
  name in the path, e.g. `arbitrum`). No auth headers.
- `x-client-id` is a **self-chosen string** (we send `session-fees-poc`); it
  only affects rate-limit tiering. Default limit ~3 rps — fine under the
  dapp's 500 ms debounce + 30 s refresh.
- CORS is open, so the browser calls the API directly (no proxy, no env vars).

## Transaction handling

- `route/build` returns router calldata: send `{ to: routerAddress, data,
  value: transactionValue }` as a standard `eth_sendTransaction`
  (`kyberToWalletConnectTx` converts values to hex and adds 50% gas headroom
  to Kyber's estimate).
- Router: `MetaAggregationRouterV2`
  (`0x6131B5fae19EA4f9D964eAc0408E4408b66337b5`, same address on every chain).
- Selling **native ETH** → no ERC-20 approval, one signature. (An ERC-20
  input would need an approval to the router first.)
- Wallet signs and broadcasts; the dapp polls the receipt on
  `NEXT_PUBLIC_ARBITRUM_RPC_URL` (defaults to rpc.walletconnect.com).

## Gotchas

- **Don't cache routes**: `routeSummary` pins exact pool states and goes
  stale in ~5–10 s. Building the swap from the displayed (up to 30 s old)
  quote reverted on-chain with `Return amount is not enough`, so the dapp
  **fetches a fresh route at Swap click** and only uses the displayed quote
  for the UI. Kyber also gets a wider slippage tolerance (100 bps vs 50 for
  the others) because tiny demo swaps route through volatile micro-pools.
- The fee params live on `/routes`, not `/route/build` — forgetting them on
  the quote means no fee in the built calldata.
- `route/build` responses use Kyber's `{code, message, data}` envelope;
  `code !== 0` is an application error even with HTTP 200.
- Kyber's `gas` estimate can run tight — the dapp adds 50% headroom.
