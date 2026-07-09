# Session Fees — 1inch integration (Arbitrum One)

How the fee-demo dapp applies wallet-declared `wc_feeTerms` as a 1inch
Classic Swap partner fee. Code:
`advanced/dapps/react-dapp-v2/src/helpers/oneinch.ts`, the proxy at
`src/pages/api/oneinch/[...path].ts`, and the 1inch branch of
`src/pages/index.tsx`.

## Flow

```
wallet ──(session approval)──▶ sessionProperties.wc_feeTerms
                                  { feeRecipientEip155, feeBps }
                                        │
dapp reads terms on settle              ▼
GET /swap/v6.0/42161/quote  ?src=ETH&dst=USDC&amount=…&fee=<feeBps/100>&referrer=<recipient>
GET /swap/v6.0/42161/swap   ?…same…&from=<user>&origin=<user>&slippage=0.5
        │ returns { dstAmount, tx: { from, to, data, value, gas } }
        ▼
WalletConnect eth_sendTransaction [tx]  → wallet signs & broadcasts
dapp polls the tx receipt on its own RPC
fee is paid to the recipient EOA inside the same swap transaction
```

## ⚠️ Fee collection is gated — commercial agreement required

**Empirical finding (2026-07-09, live mainnet swap + API probes):** free
Dev-tier keys **validate** `fee` + `referrer` (`fee > 3` is rejected) but
**silently do not apply them** — `dstAmount` is identical with and without
`fee`, and the `/swap` calldata contains no referrer payout (confirmed
on-chain: the swap tx carried no fee transfer).

This matches 1inch's legal structure: the free-key
[Public API ToS](https://business.1inch.com/portal/assets/legal-docs/terms_of_service_public_api_20250508.pdf)
restricts usage to non-commercial purposes ("cannot be used … to receive any
monetary or other compensation"), while the
[Commercial API ToU](https://business.1inch.com/portal/assets/legal-docs/terms_of-service_commercial_api_20251107.pdf)
§6.11 explicitly grants the "User's Fee" right. There is **no self-serve
toggle**: enabling fees requires a paid plan (Startup $149+/mo and up) plus
1inch approval under the Commercial ToU — contact info@1inch.dev / csm@1inch.com.

The integration below is correct and complete; it collects fees the moment a
fee-enabled key is configured, with zero code changes. Until then, swaps
execute normally with **no fee collected**.

## Fee mechanics

- **Params:** `fee` (a **percent**, 0–3, e.g. `0.5` = 50 bps) + `referrer`
  (the EOA that receives the fee). Both must be passed together, and
  **identically on `/quote` and `/swap`**. The dapp maps
  `wc_feeTerms.feeBps / 100 → fee` and `feeRecipientEip155 → referrer`.
- **Cap:** 3% (`ONEINCH_MAX_FEE_BPS = 300` clamps in the dapp).
- **Recipient is a plain EOA** — no token account setup, no initialization
  step (unlike Jupiter's ATA requirement). Fees arrive as an ERC-20 transfer
  inside the swap tx, visible per swap on Arbiscan.
- **1inch's cut:** none taken from the partner fee itself — see the
  infrastructure fee section below for the separate cut 1inch takes for
  themselves.
- The returned `dstAmount` is **net of the fee**; the dapp backs the fee out
  for display (`dst * feeBps / (10000 - feeBps)`).

## The 1inch "infrastructure fee" (why demo numbers don't reconcile exactly)

Every 1inch API swap carries **two independent fees**, and only one is ours:

1. **Our integrator fee** — the `fee` + `referrer` params driven by
   `wc_feeTerms`. Transferred **in full** to our fee recipient inside the swap
   tx. 1inch takes no share of it.
2. **1inch's infrastructure fee** — how 1inch monetizes API users. On the
   free Dev tier they deduct **10 bps on stable↔stable swaps and 30 bps on
   everything else** (ETH→USDC counts as 30 bps) from the destination amount
   before quoting. There is no parameter for it, it never appears in the
   response, and it goes to 1inch. Paid plans shrink it (down to 2–5 bps on
   the Business tier).

Worked example — 0.001 ETH swap, quoted `dstAmount = 1.748907 USDC`:

| | Amount | Goes to |
|---|---|---|
| Market value of 0.001 ETH | ~1.764 USDC | — |
| 1inch infrastructure fee (~30 bps) | ~0.005 USDC | 1inch |
| Our integrator fee (50 bps) | ~0.009 USDC | our fee recipient ✅ |
| User receives (`dstAmount`) | 1.748907 USDC | user |

Practical consequence: if someone audits the demo with
"user received + fee recipient received ≈ market rate", the sum will be
**~30 bps short**. That gap is 1inch's own cut, not a leak in the session-fee
logic. Jupiter-mode numbers reconcile exactly because Jupiter takes 0% on its
permissionless fee path. If the gap matters, use a paid 1inch plan (2–5 bps)
or an aggregator with no house cut (KyberSwap, 0x, Jupiter).

## API access — key + proxy required

- `api.1inch.dev` requires an `Authorization: Bearer <key>` header and does
  **not** allow browser CORS. The dapp therefore calls its own Next.js API
  route `/api/oneinch/*`, which forwards to 1inch with the key attached.
- The key is **server-side only**: `ONEINCH_API_KEY` in `.env.local` (no
  `NEXT_PUBLIC_` prefix — it never reaches the browser).
- Keys are self-serve and free at https://portal.1inch.dev (Dev plan:
  ~1 req/s, 100k calls/month). The dapp's 500 ms quote debounce + 30 s refresh
  stays within that.
- The proxy whitelists only `swap/v6.x/<chainId>/quote|swap` paths so it can't
  be used as an open relay.

## Transaction handling

- `/swap` returns a ready transaction object. `toWalletConnectTx()` converts
  the decimal `value`/`gas` fields to hex (`value`, `gasLimit`) and the dapp
  submits it as a standard `eth_sendTransaction` session request on
  `eip155:42161`.
- Selling **native ETH** (1inch pseudo-address `0xEeee…EEeE`) means **no ERC-20
  approval transaction** — the whole swap is one signature, matching the
  session-fees story. (Selling an ERC-20 would add an approval to the 1inch
  router first.)
- The wallet (react-wallet-v2) signs and broadcasts; the returned hash is
  polled by the dapp via `waitForTransaction` on `NEXT_PUBLIC_ARBITRUM_RPC_URL`
  (defaults to rpc.walletconnect.com).

## Gotchas

- **`fee` is percent, not bps** — passing `50` would mean 50%, instantly
  rejected. Divide bps by 100.
- Missing/invalid `referrer` with `fee` set → 400 from the API.
- Free-tier 1 rps: bursty UIs will hit 429s; keep the debounce.
- `origin` (the tx sender) is required on `/swap` in v6 for compliance
  screening; the dapp passes the connected address for both `from` and
  `origin`.
