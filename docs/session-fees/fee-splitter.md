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
deployed splitter, the **dapp can derive the correct splitter address itself**
from the wallet's beneficiary EOA (CREATE2), so fees can only ever land where
the 20/80 is enforced by code. The splitter turns the split from a promise
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
  address` pure/view — the function dapps/SDKs use for derivation and
  verification.
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

## 4. `wc_feeTerms` v2 — carrying per-chain recipients

Values in `sessionProperties` are strings, so the JSON stays compact. Two
viable schemas; **Option B is recommended**.

### ❌ Option A — declared recipients map (REJECTED)

Wallet declares ready-to-use recipient addresses. Rejected: trust-based — a
wallet could declare its own EOA and keep 100%. Kept only as the documented
*fallback shape* for chains where the splitter factory is not yet deployed.

### Option B (recommended) — declare beneficiaries, derive the splitter

```json
{
  "version": 2,
  "feeBps": 50,
  "beneficiaries": {
    "eip155": "0xWalletPayoutEOA",
    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "WalletPayoutSolanaAddress"
  }
}
```

- The wallet declares only **its own payout EOA per namespace/chain**. The
  dapp (via a small SDK helper) derives the fee recipient:
  `recipient = factory.computeAddress(walletEOA, WCN_EOA, 8000)` — with the
  factory address, WCN beneficiary, and ratio as **published per-chain
  constants**.
- Pros: **enforcement by construction** — the dapp always routes fees to a
  code-enforced splitter; a wallet cannot substitute a keep-everything
  address. Smallest possible payload; rotation is just changing the EOA.
- Cons: requires the canonical factory deployed per chain + an SDK constant
  set; chains without a factory need a documented fallback (see rollout).
- Hybrid rollout: v2 dapps derive on chains where the factory exists and fall
  back to explicit `recipients` entries elsewhere (Solana first phase).

### Trust model — who can cheat, and what stops them

- **Wallet-side bypass (solved by derivation):** the wallet never transmits a
  recipient, only its payout EOA — one *input* to the address formula. The
  dapp computes the recipient; there is nothing for the wallet to lie about.
  Note the enforcement comes from *derivation*, not the transport: moving the
  address into a dedicated protocol method (e.g. `wallet_getFeeTerms`) does
  not help by itself, since anything the wallet transmits can be false and
  anything the dapp computes cannot.
- **Dapp-side bypass (not solvable on-chain):** the dapp builds the
  aggregator call and could apply no fee, or its own recipient. No contract
  prevents this — it is handled economically (session fees as a distribution
  agreement) and by monitoring; keep this in mind to avoid over-engineering
  the wallet side.
- **Evolution — Option C, WCN registry:** wallets register their payout EOA
  once with WalletConnect (keyed by wallet project ID); sessions carry only
  `feeBps`/participation, and the dapp SDK resolves beneficiaries from the
  registry. Adds verified identity (terms tied to a known wallet project, not
  to session-claimed data), centralizes rotation and fee policy. Cost: a
  lookup dependency + WCN infra. Recommended as the follow-up to B, not a
  prerequisite.

### Setting the fee % — per wallet, per chain, per dapp

`feeBps` is a separate axis from the recipient. Options, composable:

1. **Wallet-declared, WCN-capped (v2 recommended):** `feeBps` in
   `wc_feeTerms` as today, clamped by a WCN-published max and by each
   aggregator's own cap.
2. **Per-namespace/chain overrides:** `"feeBps": {"default": 50,
   "solana": 85, "eip155:1": 30}` — economics differ per chain (mainnet gas
   makes small fees pointless; Solana tolerates higher bps).
3. **Per-dapp:** dapp-side policy — the wallet's declared bps acts as a
   *maximum*, the dapp applies `min(walletMax, dappPolicy)`. Leaves room to
   later negotiate a dapp share of the fee.
4. **Registry policy (with Option C):** fee schedule per wallet (or
   wallet×dapp) lives in the WCN registry; sessions carry only identity.

v2 recommendation: wallet-declared default + optional per-namespace
overrides, clamped by WCN max and dapp policy.

### How wallets define EOAs per chain — the possibilities

1. **One EVM address for everything** (namespace-level `eip155` entry) — the
   norm; the same key controls the address on all EVM chains, and CREATE2
   gives one splitter address everywhere. Recommended default.
2. **Per-chain overrides** (full CAIP-2 keys) — for wallets with separated
   treasury ops per chain, or chains where the canonical factory isn't
   deployed.
3. **Per-namespace non-EVM entries** — Solana/other namespaces have different
   address formats and splitter mechanics; always separate entries.
4. **On-chain registry** (future) — wallets register payout addresses once in
   a WCN registry keyed by a wallet identifier; dapps look them up instead of
   reading them from the session. Adds rotation without session changes, at
   the cost of infra + a lookup. Not needed for v2.
5. **Name resolution** (ENS et al.) — possible but adds a resolution
   dependency to every quote; not recommended.

## 5. Solana

The EVM splitter doesn't translate directly — Jupiter's `feeAccount` must be
a **token account** of the input/output mint. The equivalent design:

- A small program (`wcn_fee_splitter`) owning **PDA-derived token accounts**
  per (walletBeneficiary, mint): PDA seeds = `["wcn_fee", wallet_pubkey]`,
  fee accounts are the PDA's ATAs. The dapp derives the fee ATA exactly like
  the POC derives ATAs today — deterministic, counterfactual-ish (ATA must be
  initialized once, same constraint the POC already documents).
- Permissionless `distribute(mint)` instruction transfers the PDA ATA balance
  80/20 to the wallet's and WCN's ATAs.
- Alternative for phase 1: keep Solana split off-chain (recipient = WCN- or
  wallet-operated multisig e.g. Squads, distribution by agreement) and ship
  the program in phase 2. Or lean on aggregator-native multi-recipient
  support where it exists (0x on EVM has it; Jupiter does not).

## 6. Open questions / decisions needed

1. Ratio governance: hardcode 8000/2000 in the salt (a ratio change = new
   splitter address) vs a versioned constant — recommended: in the salt,
   fully immutable per instance.
2. Who runs the release keeper (WCN service vs each wallet claims) and the
   minimum-balance threshold per token.
3. Which party is the canonical WCN beneficiary per chain (one global EOA vs
   per-chain treasury), and where those constants are published (SDK? docs?
   on-chain registry?).
4. Does WCN want `wc_feeTerms` v2 to be a signed statement (wallet attests
   terms) — orthogonal to the splitter but natural to bundle into the same
   version bump.
5. Solana phase 1 approach (multisig vs program from day one).
