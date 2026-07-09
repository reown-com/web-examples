# Session Fees — aggregator research

Which swap aggregators/protocols let an integrator collect a **per-request fee**
(bps + recipient) that can be driven by wallet-declared `wc_feeTerms`?
Researched against live docs/APIs, July 2026. Companion to
[SESSION-FEES-POC.md](./SESSION-FEES-POC.md).

Evaluation criteria, in order:

1. Fee params usable **without a partnership/approval process**
2. Where fees land and whether they're **explorer-visible on an address we control**, ideally per-swap
3. Returns a **ready-to-sign transaction** (fits the one-signature WalletConnect flow)
4. Chain coverage / docs quality

## Comparison

| Aggregator | No partnership needed? | Fee params (per request) | Cap | Their cut | Fees land | Tx-ready | Chains |
|---|---|---|---|---|---|---|---|
| **Jupiter** ✅ *(integrated)* | ✅ Fully permissionless, works keyless | `platformFeeBps` (quote) + `feeAccount` (swap) | 255 bps (u8, V1) | **0%** | recipient's token account (ATA), in-tx | ✅ base64 versioned tx | Solana |
| **0x Swap API** | ✅ Self-serve key; fees explicitly documented on the free tier. *Not yet empirically verified (needs a key) — 1inch-style silent gating considered low-risk here but unconfirmed* | `swapFeeBps` + `swapFeeRecipient` + `swapFeeToken` | 1000 bps | 0% of your fee (+ own ~15 bps on select tokens, free tier) | EOA, in-tx | ✅ `{to,data,value}` | 21 EVM (Base, Arb) |
| **KyberSwap** ✅ *(integrated, E2E-verified on mainnet)* | ✅ **No key, no registration** (fee = exactly 50 bps of gross paid in-tx, zero Kyber cut, confirmed on-chain) | `feeAmount` + `feeReceiver` + `chargeFeeBy` + `isInBps` | none documented | **0%** (keeps positive slippage) | EOA, in-tx | ✅ `route/build` calldata | 18 EVM (Base, Arb) |
| **ParaSwap / Velora** | ✅ No signup (`partner` = any string). **Empirically re-verified 2026-07-09**: partner address present in built calldata with `isDirectFeeTransfer` (note: `/prices` does not reflect the fee; it's applied at `/transactions` build) | `partnerAddress` + `partnerFeeBps` + `isDirectFeeTransfer: true` | 200 bps | 15% | EOA in-tx with direct flag (default: FeeClaimer contract, claim-based) | ✅ | 9 EVM (Base, Arb) |
| **OpenOcean** | ✅ No key. **Empirically re-verified 2026-07-09**: quote drops by the fee and referrer present in calldata | `referrer` + `referrerFee` (input token) | 5% | ~20% | EOA, in-tx | ✅ | 40+ EVM + Solana |
| **1inch** (Classic Swap) | ❌ **Fee collection requires a commercial agreement** (empirically verified: free Dev keys validate `fee`+`referrer` but silently ignore them — quotes identical, no referrer payout in calldata). Free-key ToS explicitly forbids receiving compensation; monetization needs a paid plan + 1inch approval under the Commercial API ToU (info@1inch.dev) | `fee` + `referrer` | 3% | 0% of your fee + 10–30 bps "infrastructure fee" (2–5 bps on Business tier) | EOA, in-tx (once enabled) | ✅ `tx` object | 14 incl. Base/Arb + Solana |
| **Uniswap Trading API** | 🟡 Self-serve key; unverified "Fee is not enabled" 401 in spec — **after the 1inch finding, treat silent/hard gating as likely until a keyed smoke test proves otherwise** | `integratorFees: [{bips, recipient}]` | 500 bps | 0% documented | EOA, in-tx (Universal Router `PAY_PORTION`, output token) | ✅ | EVM |
| **Odos** | 🟡 Free key (v3) or one-time on-chain code registration (v2) | `referralFee` + `referralFeeRecipient` (v3) | 2% (v2 on-chain) | 20% | EOA, in-tx (80% forwarded immediately) | ✅ quote→assemble | 14 EVM + Solana (keyed) |
| **OKX DEX API** | 🟡 Dev account + HMAC request signing | `feePercent` + `from/toTokenReferrerWalletAddress` | 3% (10% Solana) | 20% at paid tier | EOA, in-tx (Solana referrer needs SOL pre-funded) | ✅ EVM calldata + Solana | EVM + Solana |
| **LI.FI** | 🟡 Free portal signup + fee-wallet config required (fee param rejected otherwise — live-verified) | `integrator` + `fee` | unclear | undisclosed share | configured fee wallet, per swap (direct-forwarded) | ✅ `transactionRequest` | 30+ EVM + Solana |
| **Raydium Trade API** | ❌ **Empirically resolved 2026-07-09: params accepted but pay nothing** — `/compute/swap-base-in` returns `referrerAmount: 0` for both documented variants (`referrer=` and `referrerBps`+`referrerWallet`). Needs the undefined "referrer authority" setup; same silent-gating pattern as 1inch | `referrerBps` + `referrerWallet` | ambiguous | undocumented | (would be referrer's ATA, in-tx) | ✅ base64 versioned tx | Solana |
| **CoW Protocol** | ✅ Technically (partner fee in signed `appData`) | bps + recipient in order appData | 100 bps | **25%** (CIP-75) | ❌ weekly aggregated WETH payouts (≥0.001 WETH), not per-swap | ❌ EIP-712 intents, gasless, async | EVM (no Solana) |
| **PancakeSwap** | ❌ Hosted API has no fee param; SDK-only (`SwapRouter` fee option) means assembling calldata ourselves | — | — | — | — | — | BNB/EVM |
| **LlamaSwap** (swap.defillama.com) | ❌ No public API (Cloudflare-gated private backend); DefiLlama hardcodes **its own** referral codes into the aggregators above | — | — | — | — | — | — |
| **Aave v3 Vaults** | ❌ Not per-request: deploy a wallet-owned ERC-4626 vault, performance fee on yield, **50% to Aave Labs** | — | — | 50% | accrued in vault, owner claims as aTokens | ✅ deposit txs via SDK | EVM |
| **Kamino** | ❌ Nothing per-request: swap API has no fee param; klend referral pays **0 bps on all 33 live markets** (verified on-chain); curator vaults = operate a product | — | — | — | accrued, claim to ATA | ✅ base64 versioned tx (ktx API) | Solana |


## Top WalletConnect-volume dapps beyond swap aggregators

The highest-volume dapps on the WalletConnect Network are mostly lending,
staking, RWA, and perps — not aggregators. Assessed July 2026 through the same
lens: can wallet-declared `wc_feeTerms` attach a fee to the transaction the
user signs, and if not, what is the closest monetization shape?

| Dapp / protocol | Per-request fee? | What actually pays | Shape & gating | Fees visible |
|---|---|---|---|---|
| **Hyperliquid** (app.hyperliquid.xyz) | ✅ **Builder codes** — `builder: {b: address, f: fee}` on every order (f in tenths of a bp; cap 10 bp perps / 1% spot) | Per-order fee in USDC to the builder's HL account, claimable. **Proof at scale: Phantom ~$20.6M, PVP.trade ~$7.2M, >$40M total paid to builders** | **Permissionless** (builder needs only ~$100 USDC on HL). User signs a one-time EIP-712 `approveBuilderFee` (max-fee cap, revocable) — fits the WC flow as `eth_signTypedData_v4`, and is arguably a *better* consent story than aggregator fees. Orders themselves are agent-key signed | HL explorer/API + community dashboards, per-builder |
| **Lido** (stake.lido.fi) | 🟡 `submit(_referral)` is permissionless **but pays nothing** (referral programs retired 2023) — the 1inch pattern on-chain | **Rewards-Share Program**: negotiated up to 2.5% of staking rewards on attributed ETH, 12 mo, paid quarterly in stETH; wallets explicitly eligible | BD/committee application; ~40k ETH track-record bar. The session fee recipient could literally be the registered referral address (attribution hook is per-request) | Referral tagged on each stake tx (`Submitted` event); payouts are separate quarterly stETH transfers |
| **Morpho** (app.morpho.org) | ❌ on Blue supply/borrow | **Vault-layer fees, protocol-native**: deploy/curate own Vault V2 (perf fee ≤50% of yield + mgmt ≤5%/yr, `feeRecipient` you control) or the documented **Fee Wrapper** over an existing vault; official "distributor revenue" doc exists | **Permissionless** (vault/factory deploy). Proven wallet path: Trust Wallet ($50M+ month one), Ledger (via Kiln), Robinhood Earn | Fees minted as vault shares to `feeRecipient` — fully on-chain |
| **Euler v2** (app.euler.finance) | ❌ | Own EVK/Earn vault: curator performance fee up to 50% of yield to your fee receiver; DAO share capped at 50% | **Permissionless** factory deploy — "own the venue", like Morpho | On-chain (fee shares to receiver) |
| **Aave** (app.aave.com) | ❌ `referralCode` uint16 exists on supply/borrow but is **documented inactive** ("pass 0"); Aavenomics 3.0 routes all protocol revenue to AAVE buybacks | White-label **Aave instance** (EtherFi-style): operator keeps ~80% of reserve-factor revenue | **Governance proposal required** — heavyweight partnership | Instance reserves accrue on-chain (Collector) |
| **Spark / Sky** (app.spark.fi) | 🟡 sUSDS/PSM3 take a `uint16 referral` — **event-only, no recipient, no on-chain payment**; feeds Sky's off-chain "Integration Boost" rewards | Sky off-chain reward programs keyed to the referral code | Program-dependent — 1inch-class gating risk; verify with Sky BD | `Referral` event only; payouts off-chain |
| **Curve** (curve.finance) | ❌ router has no fee slot at all | Route Curve liquidity **through a fee-param aggregator** — exactly our existing Kyber/0x path | Permissionless via the aggregator layer | Via the aggregator's in-tx fee transfer |
| **Ethena** (app.ethena.fi) | ❌ (mint KYC-gated to ~20 market makers; sUSDe = bare ERC-4626 deposit) | Negotiated distribution deals (TON/Telegram +10% APY shape); referral codes pay points, not cash | **BD only** | Off-band |
| **Maple / syrupUSDC** (app.maple.finance) | ❌ today (referral codes pay user points/"Drips") | **"Maple Builder Codes" announced for 2026**: permissionless, self-serve configurable revenue share — the first non-swap primitive matching the session-fees shape. Track it | Today: MapleKit is whitelist-gated. Future: permissionless (announced) | TBD (likely rev-share on yield, not per-tx) |
| **Hashnote USYC** (usyc.hashnote.com) | ❌ | Circle B2B distribution agreements (KYC/allowlisted holders only) | Closed institutional | — |
| **Benjiswap** (benjiswap.io) | ❌ | Franklin Templeton's closed BENJI swap venue; bilateral distribution deals (e.g. MoonPay) | Closed institutional | — |
| **Safe** (app.safe.global) | ❌ (wallet infra — txs are user-authored) | n/a per-request; notably Safe itself monetizes via a widget fee on its native swaps (CoW/LI.FI) — another proof of the frontend-fee model | — | — |
| **Etherscan** (etherscan.io) | ❌ N/A (explorer; users sign arbitrary contract writes) | — | — | — |

## Takeaways

- **The per-request integrator-fee pattern is industry-standard**: 11 of 16
  candidates support it. `wc_feeTerms` generalizes across all of them with no
  protocol changes — the dapp just maps `feeBps`/`feeRecipient` onto each
  aggregator's params.
- **LlamaSwap is the proof of the business model**: DefiLlama's "zero-fee" swap
  UI monetizes by hardcoding its own referral into 0x/1inch/ParaSwap/Kyber/Odos
  calls — exactly the fee slot the session-fees design gives to wallets.
- **Yield products (Aave Vaults, Kamino) don't fit the per-request shape.**
  Monetization there is entity-level (deploy/curate a vault, own its fee) — a
  separate "session fees for yield" design, not this POC.
- **Skip**: CoW (intent-based signing + weekly aggregated payouts — wrong shape
  for a one-signature, watch-the-fee-arrive demo), PancakeSwap, LlamaSwap.

### Patterns across the whole WCN landscape (July 2026)

Monetization surfaces for a wallet fall into four buckets:

1. **In-transaction fee param that pays permissionlessly** — swap aggregators
   (Jupiter, KyberSwap, Velora, OpenOcean, 0x) and, uniquely outside swaps,
   **Hyperliquid builder codes**. This is the native habitat of `wc_feeTerms`.
2. **Attribution param + enrollment program** — the param rides in the tx but
   pays only after a deal: Lido `submit(_referral)` + Rewards-Share Program,
   Spark/Sky `referral` uint16 + off-chain rewards, 1inch `fee`/`referrer` +
   commercial agreement, Raydium referrer params + "referrer authority".
   `wc_feeTerms` supplies the attribution address; revenue needs BD.
3. **Own the venue (curated vaults)** — Morpho Vaults V2 (best-documented,
   proven by Trust Wallet/Ledger/Robinhood), Euler v2, Aave v3 Vaults. The
   session fee recipient becomes the vault `feeRecipient`; monetizes deposits
   routed into wallet-curated vaults, not arbitrary dapp traffic.
4. **BD-only / closed** — Ethena, USYC, Benjiswap, white-label Aave instances.
5. **Watch**: Maple's announced permissionless "Builder Codes" (2026) would
   move it from bucket 4 to bucket 1 for yield deposits.

The strongest new proof point for the whole session-fees thesis is
**Hyperliquid builder codes**: a permissionless per-request fee with explicit
user consent (signed max-fee approval) that has already paid **>$40M to
frontends/wallets** — Phantom alone ~$20.6M. It is the same design `wc_feeTerms`
generalizes, shipped by the venue itself.

## Integration priority (proposal)

Ordering by *where wallet swap volume actually flows* (e.g. Trust Wallet routes
through 1inch and the Uniswap Trading API at very high volume) rather than by
integration friction:

1. ~~**1inch**~~ — biggest wallet-integration footprint, and the integration is
   **built and ready** in the fee-demo dapp, but fee collection turned out to
   be **commercial-agreement-gated** (verified empirically + in the ToS):
   free Dev keys silently ignore `fee`/`referrer`. The code works unchanged
   the moment a commercial key is provisioned; until then no fee is collected.
2. **Uniswap Trading API** — very high wallet TNV (~$187M via Trust); needs one
   smoke test with a real key to clear the "Fee is not enabled" 401 question
   (high risk it is gated exactly like 1inch).
3. **KyberSwap** — the zero-friction, zero-cut EVM option (no key, no cap,
   live-verified); the pragmatic choice for a *working* EVM fee demo.
4. **0x** — original EVM pick, fully validated docs (fees documented on the
   free tier); solid alternative to Kyber.

Everything else is either redundant with the above (Odos/OpenOcean/OKX/Velora —
same pattern, worse splits or more friction) or reachable later via the same
`wc_feeTerms` mapping. LI.FI is worth revisiting when cross-chain swaps enter
scope, since fees forward per-swap and it covers 30+ chains incl. Solana.

## Research notes

Full per-aggregator findings (params, caps, revenue splits, sources) were
gathered from official docs and live API probes in July 2026. Key gotchas
worth re-verifying at integration time:

- **Velora**: whether free-tier partner IDs fully unlock fee economics; 15% cut
  under `isDirectFeeTransfer` unverified on-chain.
- **Uniswap**: does `integratorFees` work on a fresh self-serve key
  (OpenAPI 401 "Fee is not enabled" wording suggests a legacy gate).
- **Raydium**: `referrerBps` vs fixed-1% docs conflict; "referrer authority"
  undefined — one live call settles it.
- **1inch**: RESOLVED (2026-07-09, live mainnet swap + API probes): free Dev
  keys validate but ignore `fee`/`referrer` — no payout in calldata, quotes
  identical with/without fee. Public API ToS forbids monetization on free
  keys; Commercial API ToU §6.11 grants the "User's Fee" right after a paid
  plan + 1inch approval. No self-serve enablement exists; the keyless v5 API
  is dead (301 to the business portal).
