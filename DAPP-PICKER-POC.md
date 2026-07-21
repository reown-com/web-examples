# Dapp Picker POC (H2b) — dapp side + connect-variant comparison

Companion to the Session Fees POC ([SESSION-FEES-POC.md](./SESSION-FEES-POC.md)); both POCs live on the session-fees-poc branch.
A wallet ships an Explore directory of fee-honoring dapps; tapping a tile
opens this dapp in a webview with a **monetized WC session pre-established**.
Wallet side: `react-native-examples` branch `dapp-picker-poc`
(`wallets/rn_cli_wallet/DAPP-PICKER-POC.md`).

Preview: `https://react-dapp-v2-git-session-fees-poc-reown-com.vercel.app`

## URL contract (what a picker tile opens)

```
/?wc_auto=1&aggregator=jupiter|oneinch|kyberswap|uniswap&connect=headless|provider
```

- `wc_auto=1` — no connect UI; the dapp acquires a WC pairing URI on load and
  hands it to the host via
  `window.ReactNativeWebView.postMessage({type:'wc_session_offer', uri})`,
  falling back to a `wc:` navigation (intercepted by the host webview). On
  settle it shows "✓ Connected via {wallet} — fee sharing active".
- `aggregator=` — presets the aggregator dropdown (chain follows: Jupiter →
  Solana, others → Arbitrum).
- `connect=` — which URI-acquisition variant to use (comparison below).

Code: `src/helpers/picker.ts` (mode parsing + host handoff),
`src/contexts/ClientContext.tsx` (`startAutoConnect`, AppKit 1.8.22 init),
banner + preset in `src/pages/index.tsx`. This branch pins the
headless-entitled projectId (`src/constants/default.ts`,
`NEXT_PUBLIC_HEADLESS_PROJECT_ID` overrides).

## Headless vs provider-direct — the comparison (Phase 0/1 findings)

Both variants were verified end-to-end (URI → wallet approval → settled
session with `wc_feeTerms` → swap-ready) in-browser and through the RN
webview. The differences:

| | **Variant A — AppKit Headless** | **Variant B — provider-direct** |
|---|---|---|
| Mechanism | `features:{headless:true}` + `appKit.prefetchWalletConnectUri()` / `subscribeWalletConnectUri()` | `appKit.getUniversalProvider()` → subscribe `display_uri` → `provider.connect({optionalNamespaces})` |
| Requirements | `@reown/appkit ≥1.8.15` **and a headless-entitled projectId** — the flag is dual-gated: local option + remote per-project config (`remoteFeatures.headless`). Non-entitled projects silently no-op | Any AppKit version with `getUniversalProvider()`; **no plan gating** — works on any projectId |
| Modal | `w3m-modal` is **never mounted** (UI injection skipped entirely) | Modal element mounts at init (normal non-headless behavior) but is **never opened** — verified `state.open=false`; the unconditional `display_uri` listener only stores the URI |
| AppKit state after settle | **Fully synced**: `useAppKitAccount().isConnected=true`, addresses populated, `getIsConnectedState()=true` — the headless flow runs AppKit's own connect path (`syncWalletConnectAccount`) | **Desynced**: session is real and usable on the provider, but AppKit account state stays `disconnected`. Root cause: AppKit's `connect` listener only does storage/analytics; the state sync runs only on AppKit-initiated connects, and there is **no public "adopt this session" API**. Reload re-sync is also not guaranteed (connectorId never persisted) |
| `sessionProperties` (`wc_feeTerms`) | ✅ via `provider.session.sessionProperties` | ✅ same |
| Quirk | The WC connector registers async after provider init — the first `prefetchWalletConnectUri()` can throw `WalletConnectConnector not found`; retry (the dapp does 4 attempts) | Requires hand-rolling `optionalNamespaces` (or reusing `WcHelpersUtil.createNamespaces`) |
| Who should use it | Dapps on AppKit hooks/state (i.e. most AppKit dapps) — this is the *supported* road | Dapps that own their session handling on the raw provider/SignClient (like this POC dapp, which predates AppKit hooks) |

**Answer to "can non-enterprise dapps do this?": yes, with a caveat.**
Provider-direct needs no entitlement and produces a fully functional session —
but a dapp built on AppKit's hooks would see itself as "not connected" after
the handshake. Such dapps need either the headless entitlement, or to bypass
AppKit state and read the provider directly (a real refactor), or a future
AppKit API to adopt an externally-established session. For dapps that already
manage sessions themselves, Variant B is drop-in.

## The handshake

```
RN wallet (Explore tile)                dapp (webview, ?wc_auto=1)
────────────────────────                ──────────────────────────
open webview  ───────────────────────▶  load; acquire wcUri (A or B)
onMessage  ◀──────────────────────────  postMessage {wc_session_offer, uri}
registerPickerPairing(topic)
walletKit.pair({uri})
auto-approve proposal                ─▶ session settles
(+ wc_feeTerms, picker-scoped,          banner: "Connected via … —
 one-time consent)                       fee sharing active"
sign sheet on request  ◀──────────────  swap → fee baked into the tx
```

URI expiry (~5 min TTL) is handled by generating on page load and pairing
immediately; a reload regenerates.

## Does this work for non-Reown dapp SDKs (RainbowKit etc.)?

**Yes — the pattern is SDK-agnostic on both ends; only the "how do I get the
URI" step varies.** The wallet side pairs a standard `wc:` URI and approves a
standard proposal — it neither knows nor cares which SDK generated it. The
dapp side needs exactly two capabilities: (1) obtain a pairing URI
programmatically without showing connect UI, (2) read the settled session's
`sessionProperties`. Per stack:

| Dapp stack | Headless URI path | Session/feeTerms access | Notes |
|---|---|---|---|
| **RainbowKit / wagmi** | First-class: the wagmi `walletConnect` connector takes `showQrModal: false`; call `connect({connector})` and listen for the connector's `display_uri` message — RainbowKit's modal is simply never opened | `connector.getProvider()` → EthereumProvider → `provider.session.sessionProperties` | Arguably **cleaner than our AppKit Variant B**: the connection runs through wagmi core, so wagmi/RainbowKit state syncs correctly — no desync caveat. EVM-only (no Solana namespace) |
| **Raw `@walletconnect/ethereum-provider`** | Canonical: `EthereumProvider.init({ showQrModal: false })` + `provider.on('display_uri')` + `provider.connect()` | `provider.session.sessionProperties` | The documented WalletConnect headless pattern; what wagmi wraps |
| **Raw sign-client / UniversalProvider** | What this POC's Variant B does | direct | No UI layer to bypass at all |
| **AppKit** | Variant A (headless, entitled) or Variant B (provider-direct, state desync caveat) | `provider.session.sessionProperties` | This POC |
| **Other aggregator SDKs (Dynamic, Privy, …)** | Case-by-case: works iff they expose the underlying WC provider or a headless connect; embedded-wallet-first SDKs may not route through WC at all | — | Needs per-SDK verification |

Implication for the H2b registry: "fee-honoring dapp" does not mean
"AppKit dapp". The registry entry needs only the URL contract
(`?wc_auto=1&…`) and the dapp-side snippet is ~30 lines against any of the
stacks above. The wallet-side code is identical for all of them.

## UX assessment — pros and cons

**The headline win is real: 1-tap wallet↔dapp pairing.** Measured on the
POC: from the Explore screen, **1 tap** (the tile) lands the user in a
connected, fee-attached, correctly-chained dapp — after a one-time consent.
The ceremony it replaces (Connect button → wallet chooser → QR/deeplink →
app switch → approve → switch back) is typically 4–6 interactions and two
context switches.

Pros beyond the tap count:
- **No context switch**: the session rides the relay while the user never
  leaves the wallet app; signing sheets appear natively *over* the webview.
- **Zero decisions**: no wallet chooser (the host *is* the wallet), no chain
  picker (the tile presets aggregator + chain), no terms to read per-dapp.
- **Trust anchor stays native**: auto-approve only covers the *connection*;
  every transaction still gets the wallet's own sign sheet.
- **Revisits are instant**: the session persists in the webview's storage —
  second open of a tile restores it with no handshake at all.

Cons / the latency question:
- **Added latency vs a plain webview browse.** Observed cold-flow timing on
  the POC (Android emulator, Vercel-hosted dapp): page load ~2–4 s, URI
  acquisition ~1–3 s after load, pair → auto-approve → settle ~2–4 s.
  **Tile-tap to "Connected" banner ≈ 5–10 s cold** (not precisely
  instrumented — worth measuring properly in a follow-up).
- **Does it degrade UX? Less than the number suggests**, for two reasons:
  (1) the handshake is *passive and concurrent* — the swap UI is fully
  rendered and browsable immediately (prices, quotes, amount entry work
  pre-connection); only the Swap button waits for the session. The user is
  reading/typing during the handshake, not staring at a spinner. (2) it
  replaces a *longer interactive* ceremony — 5–10 s of passive wait beats
  20–40 s of QR-scanning and app-switching. The failure mode to avoid is a
  blocking "Connecting…" splash; the POC deliberately keeps the page
  interactive instead.
- **Relay round trip on-device**: the handshake traverses WalletConnect
  relay infrastructure even though both ends live on the same phone —
  loopback through the internet. It works and is what makes the pattern
  zero-integration, but it adds RTTs and an availability dependency; a
  local/link-mode transport would be the optimization path if the picker
  ships for real.
- **Consent surface**: auto-approval removes the moment where users see
  what a connection shares. Mitigations in the POC: explicit one-time
  consent, picker-scoped auto-approval only (QR/deeplink proposals keep the
  full modal), per-transaction signing untouched. A production version
  should show *which* account/chains were shared (e.g. a toast on settle).
- **URI TTL (~5 min)**: harmless here since pairing happens immediately
  after generation; slow page loads regenerate on reload.

## Integration steps — for a dapp adopting this

What a production dapp needs to become "picker-openable" (≈30–100 lines,
no redesign):

1. **Support the URL contract.** Parse `?wc_auto=1` (plus whatever
   dapp-specific presets make sense — our `?aggregator=` is an example) on
   load, client-side. In `wc_auto` mode, suppress your connect UI.
2. **Acquire a pairing URI headlessly**, per your stack (details in the
   SDK-portability table above):
   - AppKit ≥1.8.15 + headless entitlement: `prefetchWalletConnectUri()` +
     `subscribeWalletConnectUri()` (retry — the WC connector registers async)
   - wagmi/RainbowKit: `walletConnect({ showQrModal: false })` connector +
     its `display_uri` message
   - raw ethereum-provider / UniversalProvider: `provider.on('display_uri')`
     + `provider.connect({ optionalNamespaces })`
3. **Hand the URI to the host**:
   ```js
   window.ReactNativeWebView?.postMessage(
     JSON.stringify({ type: 'wc_session_offer', uri }),
   ) ?? (window.location.href = uri); // wc: fallback, host intercepts
   ```
   Generate on page load, pair immediately (URI TTL ~5 min); regenerate on
   reload.
4. **Detect settle and show state** — connection promise resolution or
   AppKit/wagmi account state (or poll `provider.session`). Show a
   "connected via {session.peer.metadata.name}" affordance; keep the page
   **interactive during the handshake** (no blocking splash — this is what
   keeps the perceived latency near zero).
5. **Honor the fee terms** — read
   `provider.session.sessionProperties.wc_feeTerms` and pass
   `feeBps`/recipient into your aggregator calls (see
   [SESSION-FEES-POC.md](./SESSION-FEES-POC.md) and
   `docs/session-fees/*.md` for per-aggregator mappings). In the target
   architecture this step is replaced by the registry lookup
   ([fee-splitter design](./docs/session-fees/fee-splitter.md)) — AppKit
   would do it for you.
6. **Nothing else changes**: signing, broadcasting, and your normal
   (non-webview) connect flow stay as they are — `wc_auto` is additive.

## Corners cut (dapp side)

- `wc_auto` skips 1-Click Auth (`authentication` payload) to keep the
  auto-approve path simple; manual mode still sends it.
- Headless settle detection polls `provider.session` (1 s interval) instead
  of an AppKit event.
- Auto-connect starts once per page load (no in-page retry button beyond the
  error state; reload retries).
- The branch pins the headless-entitled projectId, overriding the Vercel
  project's env (documented in `src/constants/default.ts`).
- Desktop browsers without the RN bridge attempt the `wc:` navigation in
  auto mode (harmless no-op outside a webview; `window.__wc_last_uri` exposes
  the URI for testing).
