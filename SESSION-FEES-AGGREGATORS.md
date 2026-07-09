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
| **0x Swap API** | ✅ Self-serve key, fees on free tier | `swapFeeBps` + `swapFeeRecipient` + `swapFeeToken` | 1000 bps | 0% of your fee (+ own ~15 bps on select tokens, free tier) | EOA, in-tx | ✅ `{to,data,value}` | 21 EVM (Base, Arb) |
| **KyberSwap** ✅ *(integrated)* | ✅ **No key, no registration** (live-verified; fee receiver confirmed in built calldata) | `feeAmount` + `feeReceiver` + `chargeFeeBy` + `isInBps` | none documented | **0%** (keeps positive slippage) | EOA, in-tx | ✅ `route/build` calldata | 18 EVM (Base, Arb) |
| **ParaSwap / Velora** | ✅ No signup (`partner` = any string) | `partnerAddress` + `partnerFeeBps` + `isDirectFeeTransfer: true` | 200 bps | 15% | EOA in-tx with direct flag (default: FeeClaimer contract, claim-based) | ✅ | 9 EVM (Base, Arb) |
| **OpenOcean** | ✅ No key | `referrer` + `referrerFee` (input token) | 5% | ~20% | EOA, in-tx | ✅ | 40+ EVM + Solana |
| **1inch** (Classic Swap) | ❌ **Fee collection requires a commercial agreement** (empirically verified: free Dev keys validate `fee`+`referrer` but silently ignore them — quotes identical, no referrer payout in calldata). Free-key ToS explicitly forbids receiving compensation; monetization needs a paid plan + 1inch approval under the Commercial API ToU (info@1inch.dev) | `fee` + `referrer` | 3% | 0% of your fee + 10–30 bps "infrastructure fee" (2–5 bps on Business tier) | EOA, in-tx (once enabled) | ✅ `tx` object | 14 incl. Base/Arb + Solana |
| **Uniswap Trading API** | 🟡 Self-serve key; unverified "Fee is not enabled" 401 in spec | `integratorFees: [{bips, recipient}]` | 500 bps | 0% documented | EOA, in-tx (Universal Router `PAY_PORTION`, output token) | ✅ | EVM |
| **Odos** | 🟡 Free key (v3) or one-time on-chain code registration (v2) | `referralFee` + `referralFeeRecipient` (v3) | 2% (v2 on-chain) | 20% | EOA, in-tx (80% forwarded immediately) | ✅ quote→assemble | 14 EVM + Solana (keyed) |
| **OKX DEX API** | 🟡 Dev account + HMAC request signing | `feePercent` + `from/toTokenReferrerWalletAddress` | 3% (10% Solana) | 20% at paid tier | EOA, in-tx (Solana referrer needs SOL pre-funded) | ✅ EVM calldata + Solana | EVM + Solana |
| **LI.FI** | 🟡 Free portal signup + fee-wallet config required (fee param rejected otherwise — live-verified) | `integrator` + `fee` | unclear | undisclosed share | configured fee wallet, per swap (direct-forwarded) | ✅ `transactionRequest` | 30+ EVM + Solana |
| **Raydium Trade API** | ✅ No key, but docs self-contradict (fixed 1% `referrer` vs `referrerBps` + undefined "referrer authority") | `referrerBps` + `referrerWallet` | ambiguous | undocumented | referrer's ATA, in-tx | ✅ base64 versioned tx | Solana |
| **CoW Protocol** | ✅ Technically (partner fee in signed `appData`) | bps + recipient in order appData | 100 bps | **25%** (CIP-75) | ❌ weekly aggregated WETH payouts (≥0.001 WETH), not per-swap | ❌ EIP-712 intents, gasless, async | EVM (no Solana) |
| **PancakeSwap** | ❌ Hosted API has no fee param; SDK-only (`SwapRouter` fee option) means assembling calldata ourselves | — | — | — | — | — | BNB/EVM |
| **LlamaSwap** (swap.defillama.com) | ❌ No public API (Cloudflare-gated private backend); DefiLlama hardcodes **its own** referral codes into the aggregators above | — | — | — | — | — | — |
| **Aave v3 Vaults** | ❌ Not per-request: deploy a wallet-owned ERC-4626 vault, performance fee on yield, **50% to Aave Labs** | — | — | 50% | accrued in vault, owner claims as aTokens | ✅ deposit txs via SDK | EVM |
| **Kamino** | ❌ Nothing per-request: swap API has no fee param; klend referral pays **0 bps on all 33 live markets** (verified on-chain); curator vaults = operate a product | — | — | — | accrued, claim to ATA | ✅ base64 versioned tx (ktx API) | Solana |

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
