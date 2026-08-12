# Dapp Picker POC — Web (H2b, wallet side)

The **web** counterpart of the mobile Dapp Picker POC
([`DAPP-PICKER-POC.md`](./DAPP-PICKER-POC.md), companion to
[`SESSION-FEES-POC.md`](./SESSION-FEES-POC.md)). Same idea: the wallet ships an
**Explore** directory of fee-honoring dapps; tapping a tile opens the dapp
**inside the wallet with a monetized WalletConnect session already
established** — the user lands connected, fee terms attached, no connect
ceremony. It inverts WC's dapp-initiated pairing: the dapp still generates the
`wc:` URI but hands it to the host wallet instead of rendering connect UI.

On mobile the host is a native WebView. **On web there is no WebView — the whole
POC hinges on how a browser-based wallet embeds a third-party dapp and receives
the pairing URI from it.** That question is what this POC answers.

Apps (both on branch `session-fees-poc`):

| App | Path | Port | Role |
|---|---|---|---|
| Demo wallet (host) | `advanced/wallets/react-wallet-v2` | 3001 | Explore tab, embedded browser, URI intake, scoped auto-approve |
| Fee-demo dapp | `advanced/dapps/react-dapp-v2` | 3000 | Web host transport in `offerUriToHost()`; otherwise unchanged |

---

## 1. The embedding decision (Phase 1) — and why

**Verified against current browser behaviour and the actually-deployed dapp, not
assumed.**

**Decision: iframe first, popup fallback.**

- The deployed dapp
  (`react-dapp-v2-git-session-fees-poc-reown-com.vercel.app`) sends **no
  `X-Frame-Options`, no CSP `frame-ancestors`, no `Cross-Origin-Opener-Policy`,
  no CSP `<meta>`** (Next.js default; confirmed via response headers + served
  HTML). It renders fully inside a cross-origin iframe — confirmed live by
  embedding it from a `localhost` host page.
- **iframe** keeps wallet chrome visible, renders the wallet's native sign
  modals *over* the dapp, and needs no extra window — closest to the mobile UX.
  URI travels via `window.parent.postMessage`.
- **popup** (`window.open`) is the fallback for dapps that *do* refuse framing
  (`X-Frame-Options` / CSP `frame-ancestors`). It's a first-party top-level
  context, so its storage is **unpartitioned**. URI travels via
  `window.opener.postMessage`. Cost: a separate window, so the "no context
  switch" benefit weakens.

Options considered and **rejected** (named for completeness):

| Option | Why rejected |
|---|---|
| Same-origin reverse proxy stripping framing headers | Breaks the origin/TLS trust model; collapses all dapps into one storage partition; defeats the origin check that scopes auto-approve. |
| Browser extension (`declarativeNetRequest` strips `frame-ancestors`) | The *realistic production path* for framing **arbitrary** third-party dapps that send XFO/CSP — but it means shipping an extension. Out of scope here; named because it is the honest answer to the adoption question. |
| `wc:` protocol handler (`registerProtocolHandler`) | Can't be a no-postMessage fallback: `registerProtocolHandler` only accepts a scheme safelist plus `web+`-prefixed schemes. `wc:` is neither → `SecurityError`. Dead end on web. |

**Fallback selection is per-tile and static** (`embed: 'iframe' | 'popup'`), not
timeout-based: an XFO/CSP block is *silent* (no error event), and detecting it
after render would blow past the user-gesture window that `window.open`
requires. A production host would pre-flight the dapp's framing headers
server-side at registry-ingest time and record the mode; here it's a field on
the tile.

---

## 2. The transport contract

**URL contract** a picker tile opens (adds `host_origin` to the mobile contract):

```
/?wc_auto=1&aggregator=jupiter|oneinch|kyberswap|uniswap&connect=headless|provider&host_origin=<wallet origin>
```

**Messages** (dapp → host, `postMessage`), same shapes as mobile:

- `{ type: 'wc_session_offer', uri: string }` — on URI acquisition
- `{ type: 'wc_session_settled' }` — on settle, so the host drops its
  "Connecting…" affordance without polling

**Dapp channel selection** (`src/helpers/picker.ts` → `offerUriToHost`, first
match wins) — the RN branch stays first so the mobile POC is unaffected:

1. `window.ReactNativeWebView.postMessage` — React Native bridge (mobile)
2. framed (`window.parent !== window`) → `window.parent.postMessage(payload, hostOrigin)`
3. popup (`window.opener`) → `window.opener.postMessage(payload, hostOrigin)`
4. `wc:` navigation — last-resort

**Target origin:** the `host_origin` param, posted **verbatim** — the pairing
URI carries the session's symmetric key, so it must only reach the intended
wallet. `'*'` is used only if `host_origin` is absent (corner cut).

**Wallet intake (the security crux)** —
`src/components/EmbeddedDappBrowser.tsx` accepts a `wc_session_offer` only if
**both**:

- `event.origin === new URL(tile.url).origin` (the origin the wallet opened), **and**
- `event.source === iframeEl.contentWindow` (or `=== popupRef` for the popup)

Only then does it record the pairing topic as **picker-initiated** (in
`PickerStore`) and call `walletkit.pair({ uri })` silently. That recorded set is
the sole thing the auto-approve path trusts — which is what scopes auto-approval
to the wallet's own embedded frames.

---

## 3. What's implemented

### Dapp (`advanced/dapps/react-dapp-v2`) — surgical

- `src/helpers/picker.ts` — `getPickerMode()` parses `host_origin`;
  `offerUriToHost()` gains the web parent/opener channels; `notifyHostSettled()`
  posts the settle ack. RN path and the two connect variants are untouched.
- `src/contexts/ClientContext.tsx` — calls `notifyHostSettled()` at both settle
  points (fresh connect + restored session).
- `src/pages/index.tsx` — per-aggregator theming (styled-components
  `ThemeProvider`) so each tile resembles the real app: **Jupiter** dark + lime
  ("Selling/Buying"), **Uniswap** light + pink ("Sell/Buy"), matching wordmarks
  and buttons. The aggregator switcher is hidden in picker (`wc_auto`) mode.
  Needs `compiler.styledComponents` in `next.config.js` for stable SSR class
  names (else the themed styles hydrate-mismatch and drop).

### Wallet (`advanced/wallets/react-wallet-v2`)

| File | Role |
|---|---|
| `src/data/ExploreDapps.ts` | Registry-shaped tile array (`{ id, name, icon, color, url, aggregator, embed }`). All four tiles open the **same** dapp deployment with a different `?aggregator=` — the "picker illusion". `buildPickerUrl()` assembles the full contract. Base URL via `NEXT_PUBLIC_EXPLORE_DAPP_URL`. |
| `src/store/PickerStore.ts` | Session-scoped valtio store: active dapp/URL, status, and the picker-initiated pairing topics (with expected origin). Popup `Window` handle kept outside the proxy. |
| `src/components/EmbeddedDappBrowser.tsx` | Fills the wallet card body (an in-wallet screen; the nav footer stays visible). Wallet chrome: name, origin, close, status pill. Sole URI-intake point (origin + source gated). iframe primary; if no URI/settle arrives within 15s (framing blocked, or slow) it surfaces an **"Open in a separate window"** escape — a first-party popup, which `X-Frame-Options` does not block, so the handshake still completes via `window.opener`. |
| `src/pages/explore.tsx` | Tile grid + one-time consent dialog. Popup tiles `window.open` inside the click gesture (so the popup blocker allows it). |
| `src/utils/SessionApprovalUtil.ts` | **Single source of truth** shared by the modal and auto-approve: `getSupportedNamespaces()`, `buildSessionProperties()` (per-namespace props + `wc_feeTerms`), `autoApproveSessionProposal()`, `verifiedOriginMatches()`. The mobile POC duplicated this and flagged it — here it isn't duplicated. |
| `src/hooks/useWalletConnectEventsManager.ts` | `onSessionProposal` auto-approves **only** when the pairing topic is picker-registered **and** consent is granted **and** the verified origin matches; any failure falls back to the modal. QR / deep-link / `/wc` proposals always get the full modal. |
| `src/views/SessionProposalModal.tsx` | Refactored onto the shared util (removed the ~185-line duplicated namespace block + inline fee terms). |
| `src/store/SettingsStore.ts`, `src/pages/settings.tsx` | Persisted consent (revocable) + connect-variant toggle. |
| `src/components/Navigation.tsx` | 🧭 Explore nav entry. |

Signing is untouched: session requests render the wallet's existing sign modals
over the embedded dapp (NextUI modals portal to `body` at a higher z-index than
the overlay's `z-index: 250`).

---

## 4. What was verified (live, desktop browser)

Local run: wallet on `:3001` pointed at the local dapp on `:3000`
(`NEXT_PUBLIC_EXPLORE_DAPP_URL=http://localhost:3000`).

- ✅ **Tile tap → connected, zero connect ceremony.** Tapping a tile opens the
  embedded browser; the dapp acquires a URI, hands it over, the wallet pairs and
  **auto-approves with no modal**, and the chrome pill flips to
  **"Connected · fees active"**. The dapp shows "✓ Connected via React Wallet
  Example — fee sharing active".
- ✅ **Fee terms ride the auto-approved session.** The dapp reads
  `sessionProperties.wc_feeTerms` and shows "Fee 0.50% — 80% wallet / 20% WCN"
  with the chain-correct recipient (EVM on Arbitrum tiles, the Solana address on
  Jupiter).
- ✅ **Both connect variants.** `connect=provider` (drop-in, any projectId) and
  `connect=headless` (AppKit prefetch; requires AppKit ≥1.8.15 + a
  headless-entitled projectId) both land connected end-to-end.
- ✅ **Picker illusion + instant revisit.** Opening a second tile restores the
  same multi-namespace (`eip155` + `solana`) session instantly from partitioned
  storage; only the aggregator preset changes.
- ✅ **Auto-approve provably scoped.** Silent connect happens only via the
  picker branch; the intake requires `event.origin` + `event.source` to match
  the frame the wallet opened.
- ✅ **Consent** (one-time dialog, persisted, revocable from Settings) and the
  **variant toggle** work.
- ✅ **Popup fallback path.** A tile marked `embed:'popup'` opens via
  `window.open` with the exact contract
  (`?wc_auto=1&aggregator=…&connect=…&host_origin=…`, confirmed in the dapp
  server log), and the dapp posts back over `window.opener`.

**On-chain swap:** not re-run live here — the swap execution and the
"fee lands on-chain" result are unchanged from and already proven by the
[Session Fees POC](./SESSION-FEES-POC.md) (same session, same `wc_feeTerms`).
The picker's novel part is the connection handshake above.

**Latency (rough, not precisely instrumented):** on localhost the cold
tile-tap → "Connected" was a few seconds — comfortably under the mobile POC's
5–10 s cold figure (no on-device relay loopback, faster page load). Revisits are
effectively instant. As on mobile, the handshake is passive/concurrent: the swap
UI is browsable throughout; there is no blocking splash.

### Negative cases (verified by construction)

- **A QR-scanned / deep-link / `/wc` proposal always opens the full modal.**
  `onSessionProposal` auto-approves *only* if `proposal.params.pairingTopic` is
  in `PickerStore.pickerPairings` — a topic the wallet itself registered at
  intake. A QR pairing topic is never registered, so it can only hit the modal.
- **A `wc_session_offer` from an unexpected origin is ignored.** The intake
  listener drops any message whose `event.origin` ≠ the tile origin or whose
  `event.source` ≠ the frame/popup the wallet opened, so it never reaches
  `walletkit.pair`.

---

## 5. How web differs from mobile

- **Framing is opt-in for the dapp.** The mobile WebView renders anything; a
  browser respects the dapp's `X-Frame-Options`/CSP `frame-ancestors`. Our POC
  dapp sets neither, so iframing works — **but a real third-party dapp that ships
  those headers cannot be iframed at all.** That, not the handshake, is the
  web-specific adoption question: framing arbitrary third-party dapps in
  production needs either the dapp's cooperation (allow the wallet origin) or a
  browser extension that strips the header (`declarativeNetRequest`); otherwise
  the popup fallback is the only option, and it weakens the "no context switch"
  benefit. **Seen in practice:** a Vercel preview with **Deployment Protection**
  enabled injects `X-Frame-Options: DENY` (plus a Vercel CSP) on the deployment,
  so even our own dapp becomes unframeable on a protected preview — the wallet's
  timeout then offers the popup escape. To QA the iframe path on previews,
  disable Deployment Protection for the dapp's Vercel project (Settings →
  Deployment Protection), which is why the unprotected `session-fees-poc`
  preview frames fine.
- **Storage is partitioned.** An embedded dapp's `localStorage`/IndexedDB is
  keyed to `(top-level wallet origin, dapp origin)` in Chrome (115+), Firefox
  (Total Cookie Protection) and Safari (ITP). Because the wallet is always the
  top-level origin, the key is stable and the WC session **persists across
  revisits** ("revisits are instant" holds) — with one caveat: **Safari evicts
  script-writable storage after ~7 days** of no first-party interaction, so a
  revisit after a week may need a fresh handshake. The **popup** path sidesteps
  partitioning entirely (first-party, unpartitioned storage).
- **Origin verification is stronger and nearly free.** The wallet gates intake
  on `event.origin` + `event.source` (the exact frame it opened) — a guarantee
  the mobile scheme-intercept can't make. (The proposal's `verifyContext` is a
  bonus signal; in a framed/localhost context Verify may report the origin with
  an "Unknown" validation level, so the auto-approve treats a *present-but-
  matching* origin as a pass and an *absent* origin as "rely on the transport
  gate", rejecting only a positive mismatch.)

---

## 6. Setup & run

Both apps use pnpm and run in dev mode. Node ≥22 needs
`NODE_OPTIONS=--no-experimental-webstorage` (a pre-existing SSR `localStorage`
guard, not POC-related).

### Wallet (`advanced/wallets/react-wallet-v2/.env.local`)

```
NEXT_PUBLIC_PROJECT_ID=<your WalletConnect Cloud project id>
NEXT_PUBLIC_RELAY_URL=wss://relay.walletconnect.com
# Point Explore at a local dapp for the fast dev loop (defaults to the deployed
# preview if unset).
NEXT_PUBLIC_EXPLORE_DAPP_URL=http://localhost:3000
# Optional fee-recipient overrides (defaults: hardcoded Solana demo address +
# the wallet's 2nd EVM account).
NEXT_PUBLIC_FEE_RECIPIENT=
NEXT_PUBLIC_FEE_RECIPIENT_EVM=
NEXT_PUBLIC_FEE_BPS=50
```

The wallet's projectId does **not** need headless entitlement (it only
approves). The **dapp** already pins a headless-entitled projectId on this
branch (`src/constants/default.ts`, override via `NEXT_PUBLIC_HEADLESS_PROJECT_ID`),
so `connect=headless` works without extra dapp env.

Run each app with:

```bash
NODE_OPTIONS=--no-experimental-webstorage pnpm dev
```

Then: open the wallet → **Explore** (🧭) → tap a tile → **Allow auto-connect** on
the first-time dialog → the dapp loads embedded and lands connected. Toggle the
connect variant and revoke consent from **Settings**.

> If `pnpm dev` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`
> (non-interactive shells), run Next directly:
> `NODE_OPTIONS=--no-experimental-webstorage ./node_modules/.bin/next dev -p 3001 --webpack`.

---

## 7. Corners cut (by design)

- **Hardcoded tile array + emoji placeholder icons** — no registry.
- **Consent is a plain in-app dialog**, not a designed sheet. It covers
  connections only; every transaction still gets the wallet's own sign sheet.
- **Auto-approval trusts the picker-registered pairing topic + the origin/source
  check** — no deeper attestation. `verifyContext` origin match is applied as
  bonus hardening, leniently (see §5) since Verify can't always attest a framed
  dapp.
- **Demo fee recipients** from env (as in the Session Fees POC); the
  "80% / 20%" split is a UI label only.
- **Popup fallback is selected per-tile statically** — no runtime framing-header
  pre-flight. The demo Uniswap tile is set to `embed:'popup'` to exercise the
  path against our (frameable) dapp; a real unframeable dapp is why you'd choose
  it. Live capture of the separate popup window was limited by the automated
  test browser; the wallet opens it with the correct URL contract and the dapp
  posts over `window.opener`.
- **Desktop viewport only** — no mobile-web layout work. The embedded browser is
  a full-viewport overlay above the wallet's 450px card.
- **Happy path only.** Auto-approve failures fall back to the interactive modal;
  beyond that, minimal error UX.
- **Dependency note:** the dapp's `@reown/appkit` must be **≥1.8.15** for the
  headless variant (`prefetchWalletConnectUri`). This branch's lockfile pins
  1.8.22 (Vercel installs it); a stale local `node_modules` on an older AppKit
  throws `kit.prefetchWalletConnectUri is not a function` — run `pnpm install`.
  Overrides live in `package.json`'s `pnpm.overrides` (read by pnpm ≤9, which is
  what Vercel uses). Note: pnpm ≥10/11 ignore that field and read overrides from
  `pnpm-workspace.yaml` instead — but adding that file breaks Vercel's pnpm@9
  (it then demands a `packages:` field), so the repo keeps overrides in
  `package.json`; pnpm-11 users may see a lockfile-overrides mismatch on a fresh
  local install.
- **On-chain swap not re-run here** — see §4.
```
