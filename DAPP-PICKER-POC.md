# Dapp Picker POC (H2b) — dapp side + connect-variant comparison

Companion to the Session Fees POC ([SESSION-FEES-POC.md](./SESSION-FEES-POC.md)).
A wallet ships an Explore directory of fee-honoring dapps; tapping a tile
opens this dapp in a webview with a **monetized WC session pre-established**.
Wallet side: `react-native-examples` branch `dapp-picker-poc`
(`wallets/rn_cli_wallet/DAPP-PICKER-POC.md`).

Preview: `https://react-dapp-v2-git-dapp-picker-poc-reown-com.vercel.app`

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
