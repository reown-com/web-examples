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

## Fee mechanics

- **Params:** `fee` (a **percent**, 0–3, e.g. `0.5` = 50 bps) + `referrer`
  (the EOA that receives the fee). Both must be passed together, and
  **identically on `/quote` and `/swap`**. The dapp maps
  `wc_feeTerms.feeBps / 100 → fee` and `feeRecipientEip155 → referrer`.
- **Cap:** 3% (`ONEINCH_MAX_FEE_BPS = 300` clamps in the dapp).
- **Recipient is a plain EOA** — no token account setup, no initialization
  step (unlike Jupiter's ATA requirement). Fees arrive as an ERC-20 transfer
  inside the swap tx, visible per swap on Arbiscan.
- **1inch's cut:** none taken from the partner fee itself, **but** 1inch
  applies its own "infrastructure fee" per plan tier (Dev/free tier: 10 bps
  stablecoin / 30 bps other tokens, deducted from the destination amount of
  every swap). Factor this in when eyeballing demo numbers.
- The returned `dstAmount` is **net of the fee**; the dapp backs the fee out
  for display (`dst * feeBps / (10000 - feeBps)`).

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
- The 10–30 bps infrastructure fee on the free tier slightly worsens quotes vs
  paid tiers; it is 1inch's, not ours, and separate from `wc_feeTerms`.
- `origin` (the tx sender) is required on `/swap` in v6 for compliance
  screening; the dapp passes the connected address for both `from` and
  `origin`.
