# Session Fees — WCNFeeSplitter design (20% WalletConnect / 80% wallet)

The POC collects the whole fee on a single wallet-controlled address; the
"80% wallet / 20% WCN" split is a UI label. This document evaluates the real
split design: a `WCNFeeSplitter` contract as the fee recipient, forwarding
80% to the wallet's EOA and 20% to WalletConnect's EOA.

## 1. Does it work with the current design? Yes — cleanly

Every integration in the POC (Jupiter, KyberSwap, Uniswap, 1inch) takes an
opaque **address** as the fee recipient and transfers the fee to it inside
the swap transaction. None of them care whether the address is an EOA or a
contract:

| Aggregator | Fee delivery | Contract-recipient compatible? |
|---|---|---|
| KyberSwap | ERC-20 `safeTransfer` to `feeReceiver` in-tx | ✅ (ERC-20 transfers to contracts always succeed) |
| Uniswap | Universal Router `PAY_PORTION` (output token) | ✅ for ERC-20; **native-ETH output requires `receive()`** on the splitter |
| 1inch | in-tx transfer to `referrer` | ✅ (same caveats) |
| Jupiter (Solana) | transfer into a **token account** | ⚠️ different shape — needs a program-owned (PDA) token account, see §5 |
| 0x | in-tx transfer; **natively supports comma-separated multi-recipient fee lists** | ✅ — 0x could even split 20/80 at the API level with no contract at all |

So swapping the recipient from an EOA to a splitter address changes nothing
in the dapp or the wallet beyond the value carried in `wc_feeTerms`.

**One structural constraint drives the whole contract design**: ERC-20
transfers do not execute recipient code — the splitter **cannot auto-split on
receipt**. It must be **pull-based**: fees accumulate on the splitter and a
permissionless `release()` pays both parties out. (This also naturally
handles fee-on-transfer tokens and dust aggregation.)

**Enforcement bonus.** Today the split is unenforceable — a wallet could
declare its own EOA and keep 100%. With a canonical, deterministically
deployed splitter and recipients served by the WCN registry (§4), fees can
only ever land where the 20/80 is enforced by code — the wallet never
transmits a recipient at all. The splitter turns the split from a promise
into a property.

## 2. Recommended architecture

- **One splitter instance per wallet per chain**, deployed as an EIP-1167
  minimal proxy by a canonical `WCNFeeSplitterFactory`, with **CREATE2** and
  salt = `keccak(walletBeneficiary, wcnBeneficiary, splitBps, version)`.
- **Counterfactual addresses**: the CREATE2 address is valid before
  deployment — ERC-20/native fees can accumulate on the undeployed address
  and the contract is deployed lazily before the first `release()`. Zero
  upfront gas per wallet.
- **Same address on every EVM chain**: deploy the factory itself via a
  deterministic deployer (e.g. CREATE2 proxy / Safe singleton factory) at the
  same address cross-chain → each wallet's splitter address is **identical on
  all EVM chains**. `wc_feeTerms` then needs only ONE EVM recipient entry.
- Per-wallet instances also solve **attribution**: a shared global splitter
  could not tell whose fee an incoming ERC-20 transfer is (transfers carry no
  data); per-wallet addresses make attribution positional.

## 3. Contract requirements

### WCNFeeSplitter (v1)

Functional:
- **F1** Immutable configuration set at initialization: `walletBeneficiary`
  (EOA), `wcnBeneficiary` (EOA), `walletShareBps` (8000), `wcnShareBps`
  (2000). Shares must sum to 10000.
- **F2** Passively receive any ERC-20 (no code path needed) and native coin
  (`receive() external payable`).
- **F3** `release(address token)` — permissionless; splits the **current
  balance** of `token` 80/20 and transfers to the two beneficiaries.
  `release(address(0))` (or a dedicated `releaseNative()`) handles the native
  coin. Balance-based splitting (not amount-based) makes fee-on-transfer
  tokens and multiple accumulated fees trivially correct.
- **F4** `releaseMany(address[] tokens)` — batch convenience.
- **F5** `pending(address token) → (walletAmount, wcnAmount)` view.
- **F6** Events: `Released(token, walletAmount, wcnAmount, caller)`.
- **F7** Rounding: integer division remainder (≤1 wei/base unit) goes to the
  wallet beneficiary, deterministically.
- **F8** No other functionality: no owner, no admin, no pause, no arbitrary
  calls, not upgradeable. Funds can only ever move to the two beneficiaries.

Factory:
- **F9** `deploy(walletBeneficiary, wcnBeneficiary, splitBps) → splitter`
  via CREATE2 + EIP-1167 clone; idempotent (reverts or returns existing if
  already deployed).
- **F10** `computeAddress(walletBeneficiary, wcnBeneficiary, splitBps) →
  address` pure/view — used by the WCN dashboard/registry backend to compute
  counterfactual addresses at registration time, and by anyone auditing that
  a served recipient really is the canonical splitter. (Dapps do NOT call
  this — they receive ready addresses from the registry.)
- **F11** `event SplitterDeployed(splitter, walletBeneficiary, wcnBeneficiary, splitBps)`.
- **F12** The WCN beneficiary and default split ratio are published constants
  per chain (documented, and/or exposed by the factory) so all parties derive
  identical addresses.

Non-functional / security:
- **N1** Reentrancy-safe (checks-effects-interactions; native transfers via
  `call` with no state after, or `nonReentrant`).
- **N2** SafeERC20 semantics (USDT-style non-standard returns).
- **N3** A malicious/blacklisting token (e.g. USDC blacklist on one
  beneficiary) must not brick the other token balances — `release` is
  per-token, and a failing transfer only reverts that call.
- **N4** Permissionless `release` cannot grief: worst case someone pays gas
  to pay the beneficiaries.
- **N5** Gas: clone deployment ~45k; release ≈ 2 ERC-20 transfers + overhead.
  Claims should be batched/periodic — fees are dust-sized per swap, so a
  keeper (either party, or a WCN cron) releases when balances cross a
  threshold.
- **N6** Audit before mainnet; the surface is small (~100 lines) — this is
  intentionally boring, OpenZeppelin `PaymentSplitter`-adjacent code.

Explicit v1 non-goals (keep it boring):
- Beneficiary rotation (rotate = deploy a new splitter with the new EOA and
  update `wc_feeTerms`; counterfactual + CREATE2 makes this cheap).
- More than two payees, dynamic ratios, streaming, swaps of dust into a
  canonical token.

## 4. Primary solution: WCN Session-Fees Registry (Option C)

**Decision:** the dapp must NOT run any address derivation. It receives a
ready-to-use `recipient` (the splitter address) + `feeBps` per chain from a
**WCN-hosted registry**, resolved via the wallet's identity. The dashboard is
the write path; a public read API (same pattern as the existing explorer /
`api.web3modal.com` APIs that AppKit already consumes) is the read path.

### End-to-end flow

```
        (once, onboarding)
┌─────────────┐ 1. enable Session Fees:        ┌────────────────────┐
│ Wallet team │    payout EOAs (EVM, Solana),  │  Reown Dashboard   │
│  (human)    ├───────────────────────────────▶│  (write path)      │
└─────────────┘    feeBps per chain            └─────────┬──────────┘
                                                         │ 2. validate caps,
                                                         │    compute splitter
                                                         │    (CREATE2, no gas),
                                                         │    store terms
                                                         ▼
                                               ┌────────────────────┐
                                               │ Session-Fees       │
                                               │ Registry API       │
                                               │ (public read path) │
                                               └─────────▲──────────┘
        (every session)                                  │ 4. sessionFees terms come
┌─────────────┐ 3. user connects; AppKit          ┌──────┴──────┐  embedded in the wallet-
│ Wallet app  │    knows the selected wallet ────▶│ Dapp/AppKit │  metadata payload AppKit
└──────┬──────┘    (no session payload needed)    └──────┬──────┘  already fetches
       │ 6. user signs once                              │ 5. aggregator quote/
       │◀────────────────────────────────────────────────┤    build with feeBps
       ▼                                                 ▼    + splitter address
   chain: swap executes; fee lands on the splitter in the same tx
                             │
                             ▼ 7. keeper: release(token)
                  80% → wallet EOA      20% → WCN EOA
```

Notes on the flow:
- Step 2 uses CREATE2 counterfactual computation — the registry can serve the
  splitter address **immediately at registration, zero gas**; the contract is
  deployed lazily before the first release (§2).
- Steps 3–4: **no session payload and no wallet-side code change at all** —
  `wc_feeTerms` is dropped. Terms ride inside the wallet-metadata payload
  AppKit already fetches, and AppKit already knows which wallet the session
  belongs to. Participation is purely a dashboard registration, and
  terms/rotation changes never touch the wallet app.

### No `wc_feeTerms` — terms live in the wallet-metadata endpoint

The `sessionFees` object is embedded in the wallet's entry in the existing
WCN wallet-listings/metadata API (the one AppKit consumes today):

```json
{
  "id": "4b1b1b7f28d7762f40c70131aea78adb",
  "name": "Example Wallet",
  "rdns": "com.example.wallet",
  "image_id": "…",

  "sessionFees": {
    "version": 1,
    "updatedAt": "2026-07-10T09:00:00Z",
    "terms": {
      "eip155":   { "recipient": "0xSplitterSameOnAllEvmChains", "feeBps": 50 },
      "eip155:1": { "feeBps": 30 },
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
        "recipientOwner": "WcnFeeOwnerAddress",
        "feeBps": 85
      }
    }
  }
}
```

### How does the dapp know WHICH wallet the session belongs to?

AppKit identifies the connected wallet already; the terms lookup reuses that:

| Flow | Identification | Reliability |
|---|---|---|
| User taps a listed wallet (mobile/deeplink) | Exact wallet listing ID known to AppKit | Exact |
| Browser extension via EIP-6963 | `rdns` announced by the extension, matched to the listing | Exact |
| QR scan with an arbitrary wallet | Match `session.peer.metadata` (name/url/redirect) against the listings | Heuristic — acceptable, see spoofing analysis |
| Non-AppKit dapps (raw sign-client) | SDK helper performing the same peer-metadata lookup against the endpoint | Heuristic |

#### Edge case 1 — QR-scan flow (wallet unknown a priori)

When the user scans the QR with an arbitrary wallet instead of tapping a
listed one, AppKit learns the wallet only from `session.peer.metadata`.
Mitigations, in order:

1. **Match on the strongest fields first**: the listing's registered
   `mobile_link`/redirect and homepage URL (registered in the dashboard,
   stable), then name as tiebreaker. Wallets earning revenue from the program
   have a direct incentive to keep their listing metadata accurate —
   the matching problem is self-correcting for participants.
2. **Miss behavior**: no confident match → **no fee, never block the swap**
   (same graceful degradation as S3). A missed match costs the wallet its
   fee on that session, nothing else.
3. **Escalation path if heuristics prove too weak in practice**: reintroduce
   a minimal session hint (`wc_feeTerms: {walletId}`) or a signed identity
   attestation — both documented in Alternatives. These are additive; the
   registry design doesn't change.

#### Edge case 2 — non-AppKit dapps (raw sign-client / UniversalProvider)

Dapps not using AppKit never fetch the wallet-listings payload. Solution: a
small standalone helper package (e.g. `@walletconnect/session-fees`) exposing
`getSessionFeeTerms(session) → terms | undefined` — it takes the settled
session, performs the same lookup against the standalone endpoint (R1) using
peer metadata, and returns the ready-to-use per-chain terms. The POC dapp is
the natural first consumer. Non-integrating dapps simply collect no fees —
the program degrades to exactly today's status quo, never worse.

**Spoofing analysis:** every recipient the endpoint serves is a WCN-computed
splitter (or WCN-controlled Solana fee owner) belonging to a registered
wallet. Misidentifying the wallet can therefore only route fees *to another
registered wallet's splitter* — never to an attacker-controlled EOA — and
WCN's 20% arrives in every case. There is no profitable spoof; a signed
wallet-identity attestation remains a future hardening option if
misattribution itself ever matters financially.

### Registry data model — feeBps and recipient per chain

Namespace-level defaults with optional per-chain overrides — keys are
**CAIP-2 chain identifiers**, a bare namespace (`eip155`, `solana`) is the
default for every chain in that namespace. An override may adjust only
`feeBps`; `recipient` inherits from the namespace default (the EVM splitter
address is chain-invariant thanks to CREATE2). Resolution per swap: exact
chain key → namespace default → no entry = no fee.

- **EVM:** `recipient` is the splitter address, used verbatim as the
  aggregator fee recipient. One entry covers all EVM chains; per-chain
  overrides tune `feeBps` (mainnet gas economics ≠ L2 ≠ Solana).
- **Solana:** aggregators want a *token account* per mint, so the registry
  serves the WCN fee-owner address (`recipientOwner`, a PDA or multisig);
  the dapp derives its ATA for the fee mint with standard SPL tooling —
  the exact `getAssociatedTokenAddress` call the POC already makes. This is
  routine Solana practice, not custom derivation logic.
- feeBps caps are enforced at **write time** in the dashboard (see D3), so
  every served value is already policy-compliant; dapps still clamp to each
  aggregator's protocol cap like the POC does today.

### Component requirements

Dashboard (write path):
- **D1** "Session Fees" section on the wallet's project: opt-in, payout EOA
  per namespace (EVM address, Solana address), optional per-chain feeBps
  overrides, terms-of-service acceptance.
- **D2** On save: validate addresses, compute the CREATE2 splitter address
  per supported EVM chain, create/assign the Solana fee owner, persist.
- **D3** Enforce WCN fee policy at write time: global default (e.g. 50 bps),
  per-namespace caps (e.g. EVM ≤ 100 bps, Solana ≤ 255 bps — the strictest
  relevant aggregator cap), floor > 0.
- **D4** Change history / audit log; payout-address changes may require
  re-verification (email/2FA) since they redirect revenue.

Registry / metadata API (read path):
- **R1** `sessionFees` embedded in the existing wallet-listings/metadata
  endpoint AppKit consumes — no new endpoint for AppKit dapps; existing CDN
  caching applies. A standalone lookup (by wallet id or peer-metadata match)
  is exposed for non-AppKit consumers.
- **R2** Serves ONLY registered wallets; recipients are exclusively
  WCN-computed splitters / WCN-controlled fee owners — by construction no
  response can name a bare wallet EOA.
- **R3** Versioned `sessionFees` schema; wallets without the field → dapp
  proceeds feeless.

AppKit / dapp SDK:
- **S1** Post-connect: resolve the connected wallet (listing selection /
  EIP-6963 rdns / peer-metadata match), read its `sessionFees` from the
  already-fetched metadata, cache for session lifetime, expose e.g.
  `session.feeTerms` / `getSessionFeeTerms()`.
- **S2** Per swap: select the entry by CAIP-2 chain (chain override →
  namespace default), pass `recipient`+`feeBps` into the aggregator call,
  clamping to the aggregator's cap.
- **S3** Degrade gracefully: registry unreachable / wallet unknown / chain
  missing → proceed WITHOUT a fee (never block the swap).
- **S4** No address computation of any kind on the dapp side (per decision);
  the only local step is the standard Solana ATA derivation for the fee mint.

Wallet app:
- **W1** **No changes.** Participation, addresses, and fee levels are all
  dashboard-side. (The POC's `wc_feeTerms` sessionProperties mechanism is
  superseded; it remains useful only as a demo vehicle and for wallets that
  want to signal terms to non-AppKit dapps without the lookup.)

Keeper:
- **K1** WCN-operated service (either party may also call `release`
  permissionlessly): monitors splitter balances, batches `release`/
  `distribute` when a token balance crosses a per-chain threshold; deploys
  the splitter lazily on first release.

### Alternatives (considered, not primary)

- **Option B — dapp-side CREATE2 derivation from a wallet-declared EOA:**
  same enforcement, no registry dependency; rejected as primary because it
  adds derivation logic + published-constants management to every dapp/SDK,
  and offers no identity, no rotation-without-session-change, no fee policy
  control. Documented in git history; viable fallback if the registry is
  ever unavailable as a product decision.
- **Option A — wallet-declared recipient addresses:** rejected, trust-based
  (wallet could declare a keep-everything address).
- **Protocol method (`wallet_getFeeTerms`):** transport variation only; adds
  a round-trip and wallet-release coupling without changing the trust model.
  The registry supersedes it.
- **`wc_feeTerms` identity pointer (`{version, walletId}`):** superseded —
  AppKit identifies the wallet without any session payload. Could return as
  an explicit disambiguation hint for the QR-scan flow if heuristic matching
  ever proves too weak.

### Trust model (registry-based)

- **Wallet-side bypass: blocked at the source.** Recipients never originate
  from the wallet; they are computed and served by WCN. The wallet only
  identifies itself.
- **Dapp-side bypass: not solvable on-chain.** The dapp builds the aggregator
  call and could omit the fee; handled economically and by monitoring (the
  registry's write-side data enables exactly that monitoring: WCN knows every
  splitter address and can index expected vs. observed fee flows).
- **WCN becomes a trusted operator** of the registry and the fee-owner
  accounts on Solana — acceptable: WCN is already the party defining the
  program, and the on-chain splitter still guarantees the wallet its 80%
  regardless of registry behavior after deployment.

## 5. Scope — which methods can carry session fees?

The wallet/registry side (recipient + feeBps) is method-agnostic; what varies
is whether the thing that builds the signed payload accepts a fee parameter.
**Session fees work wherever such an attachment point exists.**

| Method / vertical | Works? | Attachment point | Evidence |
|---|---|---|---|
| **Swaps (EVM + Solana)** | ✅ proven | Aggregator fee params | POC: Jupiter, KyberSwap, Uniswap E2E on mainnet; 1inch built but commercially gated |
| **Cross-chain swaps / bridging** | ✅ same pattern (untested by us) | Bridge-aggregator fee params — LI.FI `integrator`+`fee` (forwarded per-swap after free portal signup; 30+ chains incl. Solana); Squid/Rango similar | LI.FI mechanics verified in research; natural next integration — dapp-side shape identical to swaps |
| **Perps trading** | ✅ strong fit, different transport | Hyperliquid builder codes: per-order `builder: {b, f}` after a one-time user-signed max-fee approval (EIP-712) | >$40M already paid to frontends (Phantom ~$20.6M) — the pattern productized by the venue itself |
| **Staking (Lido, ether.fi)** | 🟡 attribution only | `submit(_referral)` / `deposit(_referral)` — permissionless to pass, **pays nothing** without enrollment (Lido Rewards-Share: BD, up to 2.5% of staking rewards on attributed ETH) | The registry recipient doubles as the referral address per-request; revenue requires program enrollment |
| **Lending deposits (Aave, Morpho, Spark)** | ❌ per-request / 🟡 via vaults | No fee slot in pool contracts; monetization = wallet-curated vault (Morpho V2 / Euler) whose `feeRecipient` is the splitter | Morpho path proven by Trust Wallet/Ledger/Robinhood — monetizes deposits into *your* vault, not arbitrary dapp traffic |
| **Intent-based swaps (CoW)** | 🟡 works, weak shape | Partner fee in signed appData; 25% CoW cut, weekly aggregated WETH payouts | Fee slot exists; no per-tx visibility, EIP-712 not eth_sendTransaction |
| **Plain transfers / arbitrary contract calls** | ❌ | Nothing to attach to — no builder in the middle. Appending a fee transfer via batching (EIP-5792 `wallet_sendCalls` / 7702) is a visible surcharge, not an embedded fee — different consent story | — |
| **RWA / institutional (USYC, Benji, Ethena mint)** | ❌ | Closed/KYC venues; BD distribution deals only | Researched, skip |

By WalletConnect method: the pattern covers `eth_sendTransaction`
(swaps/bridges — proven), `solana_signTransaction`/`signAndSendTransaction`
(proven), and `eth_signTypedData_v4` for order-based venues (Hyperliquid —
strong; CoW — weak payout shape). It cannot cover methods where the user
signs something the dapp did not parameterize (`personal_sign`, plain sends).

By the four-bucket taxonomy in
[SESSION-FEES-AGGREGATORS.md](../../SESSION-FEES-AGGREGATORS.md): session
fees generalize natively to bucket 1 (per-request fee params), supply the
*attribution address* for bucket 2 (staking/lending referral programs — the
registry entry is exactly the address a wallet would enroll with Lido), plug
in as the vault `feeRecipient` for bucket 3 (curated vaults), and don't help
with bucket 4 (BD-only venues).

**Rollout implication:** v1 = swaps; v1.5 = bridging (LI.FI-class,
near-zero incremental dapp work); v2 = perps via builder codes (new
transport, best-in-class consent UX); attribution-based staking/lending as
BD programs mature. Watch item: Maple's announced permissionless "Builder
Codes" (2026) would make yield deposits the first bucket-1 primitive outside
trading.

## 6. Solana

The EVM splitter doesn't translate directly — Jupiter's `feeAccount` must be
a **token account** of the input/output mint. The equivalent design:

- A small program (`wcn_fee_splitter`) owning **PDA-derived token accounts**
  per (walletBeneficiary, mint). The registry serves the PDA owner
  (`recipientOwner`); the dapp derives its ATA for the fee mint with standard
  SPL tooling — the same `getAssociatedTokenAddress` call the POC already
  makes (ATA must be initialized once, same constraint the POC documents).
- Permissionless `distribute(mint)` instruction transfers the PDA ATA balance
  80/20 to the wallet's and WCN's ATAs.
- Alternative for phase 1: keep Solana split off-chain (recipient = WCN- or
  wallet-operated multisig e.g. Squads, distribution by agreement) and ship
  the program in phase 2. Or lean on aggregator-native multi-recipient
  support where it exists (0x on EVM has it; Jupiter does not).

## 7. Open questions / decisions needed

1. Ratio governance: hardcode 8000/2000 in the salt (a ratio change = new
   splitter address) vs a versioned constant — recommended: in the salt,
   fully immutable per instance.
2. Who runs the release keeper (WCN service vs each wallet claims) and the
   minimum-balance threshold per token.
3. Which party is the canonical WCN beneficiary per chain (one global EOA vs
   per-chain treasury), and where those constants are published (SDK? docs?
   on-chain registry?).
4. Wallet identity hardening: when to add the signed-attestation variant
   (option 3 in §4) on top of the plain `walletId` pointer.
5. Registry ↔ dashboard productization: which team owns the API, SLA, and
   whether terms fetches should flow through the existing AppKit API gateway.
6. Solana phase 1 approach (multisig vs program from day one).
