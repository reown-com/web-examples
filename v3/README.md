# Sign v3 examples

Two Next.js apps on the Sign v3 protocol:
- **Nimbus**, in `app/`, is the app.
- **Ember**, in `wallet/`, is the wallet.

Both use `@walletconnect/sign-client`'s `SignClient`, which speaks Sign v3 over the Sign v3 Rust SDK, with the WASM embedded, and falls back to Sign v2. They install the `2.26.1-canary-2` canary from npm; `scripts/use-local-sdk.sh` swaps in a local build.

```bash
cd v3/dapp && pnpm install && pnpm dev      # http://localhost:3000
cd v3/wallet && pnpm install && pnpm dev    # http://localhost:3001
```

## Try it

1. In Nimbus, click **Connect wallet**, then **Open Ember Wallet**. You can also paste the URI into Ember's **Connect dApp**.
2. In Ember, review the request and click **Connect**.
3. In Nimbus, use **Sign**, **Send ETH** or **Send USDC**, then approve in Ember.
   - Nimbus verifies signatures with viem.
   - Ember decodes ERC-20 transfers, and simulates transactions instead of broadcasting them.

The integration reads like a v2 app's:
- **dApp:** `client.connect()` then `approval()`, and `client.request()`.
- **Wallet:** `client.pair()`, then the `session_proposal` event, then `client.approve()`.
- **Events:** the familiar `client.on("session_request" | "session_delete" | …)`.

## Relay policy scenarios

The dev Relay screens connections and messages.

| Scenario | Set-up | What happens |
|---|---|---|
| Blocked project pair | Nimbus on **Policy project A** and Ember on **Policy project B**, using the project picker in each header | Ember's approval is refused: "Blocked by the Relay" |
| Sanctioned account | In Ember's account switcher, pick the account marked **sanctioned**, then connect | The connection succeeds. Requests naming the account are withheld, and Nimbus shows "No answer" after about 45 s |
| What text screening misses | Connect with a clean account. In Nimbus, send ETH or USDC with **Sanctioned address** as the recipient, or sign a message that mentions it | ETH straight to it is withheld. A USDC transfer to it, and a message naming it, both get through. Ember flags the address either way |

## Verify v4 App Signatures (experimental)

Nimbus can sign every request it sends, and Ember shows who sent it as the Relay vouches for it.

**Nimbus.** `src/pages/api/wc-attestation.ts` is a tiny signing backend. The SDK calls it before it creates a connection and before every message, through the `appSignature` callback in `src/lib/client.ts`.
- **Policy.** It refuses to sign ETH sent to a denylisted address: `0x…dEaD`, or `APP_SIGNATURE_DENYLIST`. Nimbus then fails the request instead of sending it unsigned.
- **The JWT.** ES256, with the key in `APP_SIGNATURE_PRIVATE_JWK`. The claims are `iss`, the host; `sub`, base64url SHA-256 of the request JSON exactly as the SDK sends it; and `exp`, 2 minutes. `sub` always covers the plaintext, Sign v2 and sealed messages included, so the backend signs only a request it has read. No claim covers the encrypted bytes, which the backend couldn't check; the wallet's `sub` check binds the JWT to the content. A send retried after its JWT expired asks the backend again; wallets never check `exp`.

**Ember.** It shows who sent a proposal, request or session from the SDK's `verification` only, never from the app's own name, URL or icon, which the SDK no longer exposes to wallets. It renders whatever is present:

- **the domain,** when the app's signature checked out;
- **the name and icon,** when WalletConnect reviewed the app;
- **a "✓ Verified" badge** when `isVerified`;
- **warning banners** for `isScam` and `isSimilarTo`, whatever else is present.

An unsigned request, or one over Sign v2, shows as "Unverified app". A request whose signature is for another request never reaches Ember: the SDK drops it and answers Nimbus with an error.

**Signing on or off.** Nimbus's top bar has an **App Signatures: on/off** switch, remembered per host; `?appSignature=on` or `off` in the URL sets it too. It starts on for the hosts in `NEXT_PUBLIC_APP_SIGNATURE_DOMAINS`. It stands in for deploying the signing backend, or not: a new domain sends unsigned until it is verified, and a domain that requires signatures can be tried unsigned.

**A backend not to copy.** `src/pages/api/wc-attestation-insecure.ts` signs whatever any caller sends, with no policy. It answers only with `APP_SIGNATURE_INSECURE_DEMO=on`, for the exploit demo in `v3/e2e`: with it, an attacker's script gets the app's Business verified badge on its own transaction.

**For tests.** Nimbus puts its client on `window.nimbus.client`, so the end-to-end tests can send requests as a script injected into the page would.

Nimbus signs its Sign v2 traffic too (the fallback offer and requests on a v2 session). Wallets on older SDKs show it as unverified: the Relay sends them `attestation: ""` for every Sign v2 message and never mints a legacy attestation, since old SDKs can only bind one to the encrypted envelope, which the backend can't check.

**Run it against a Relay dev slot:**

1. Make a key pair for the host the app runs on:
   ```bash
   cd v3/dapp && node scripts/app-signature-keys.mjs localhost
   ```
   It prints three things:
   - the app's env, for `v3/dapp/.env.local`;
   - `wc-domain-verify.json`, `{ allowed_organizations, keys }`, for `https://<host>/.well-known/`;
   - `RELAY_VERIFY_V4_DOMAINS`, the Relay's static registry entry.
2. Deploy the Relay's Verify v4 branch to a dev slot with that `RELAY_VERIFY_V4_DOMAINS`.
3. Point both apps at the slot: `NEXT_PUBLIC_RELAY_URL=https://pool-N.dev-relay.walletconnect.com` in each `.env.local`.
4. Install an `@walletconnect/sign-client` build with Verify v4 in both apps, then `pnpm dev`. The published `2.26.1-canary-2` predates it: Nimbus would send nothing signed, and Ember would show every app as "Unverified app".
5. In Nimbus, set **Denylisted address** as the ETH recipient to see a refused signature.

## Configuration

All settings are optional. See `.env.local.example` in each app.
- **`NEXT_PUBLIC_RELAY_URL`:** a Relay that speaks Sign v3. Defaults to the dev Relay, `https://pool-1.dev-relay.walletconnect.com`; production doesn't speak v3 yet.
- **`NEXT_PUBLIC_PROJECT_ID`:** the default project, `sign-v3-demo`.
- **`NEXT_PUBLIC_WALLET_URL`:** dApp only, where "Open Ember Wallet" points. Defaults to `http://localhost:3001`.
- **`NEXT_PUBLIC_APP_SIGNATURE`:** app only, `on` to sign with the backend, which then needs `APP_SIGNATURE_PRIVATE_JWK`. It signs as the host the page is on (`iss`), and only on the hosts in `NEXT_PUBLIC_APP_SIGNATURE_DOMAINS` (comma-separated, `*.example.com` for any name under it), the ones whose published keys include this key; on any other host it sends unsigned. Empty, it signs on every host.
- **`APP_SIGNATURE_INSECURE_DEMO`:** app only, never in a deployment. `on` serves the insecure demo backend, `/api/wc-attestation-insecure`.

## Deploying to Vercel

Make one Vercel project per app, with **Root Directory** set to `v3/dapp` or `v3/wallet`. The framework is detected as Next.js. On the dApp, set `NEXT_PUBLIC_WALLET_URL` to the wallet's URL.

## Using a local SDK build

`scripts/use-local-sdk.sh` builds `@walletconnect/types`, `utils`, `core` and `sign-client` in a walletconnect-monorepo checkout, packs them to `v3/.local-sdk`, and installs them into both apps. It leaves `package.json` and `pnpm-lock.yaml` alone: a pnpmfile points every dependency on those four packages at the tarballs, and pnpm runs without a lockfile. The Sign v3 WASM is already embedded in sign-client's source, so it needs no Rust; the monorepo's `scripts/sync-v3-wasm.sh` rebuilds it.

```bash
MONOREPO_DIR=../walletconnect-monorepo v3/scripts/use-local-sdk.sh   # the default MONOREPO_DIR
SKIP_BUILD=1 v3/scripts/use-local-sdk.sh                              # pack what's already built
v3/scripts/use-local-sdk.sh --undo                                    # back to the lockfile's packages
```

Run it again after changing the SDK, then restart `pnpm dev`. A plain `pnpm install` in an app puts the published packages back.

### Against a local Relay

With rs-relay's `scripts/verify-v4-local/up.sh` running, the Relay is `http://127.0.0.1:8080`, it knows one project, and the `*.localhost` domains publish the keys in its `.state/keys.json`. Browsers resolve `*.localhost` to this machine, so Nimbus can run as any of them; `iss` must be the host it's opened at.

```bash
# v3/dapp/.env.local
NEXT_PUBLIC_RELAY_URL=http://127.0.0.1:8080
NEXT_PUBLIC_PROJECT_ID=c0ffee254729296a45a3885639ac7e10
NEXT_PUBLIC_APP_SIGNATURE=on
NEXT_PUBLIC_APP_SIGNATURE_DOMAINS=app.localhost,required.localhost,scam.localhost,other.localhost,*.new.localhost   # the domains publishing the app key
APP_SIGNATURE_PRIVATE_JWK='…'   # jq -c .app.privateJwk <rs-relay>/scripts/verify-v4-local/.state/keys.json
APP_SIGNATURE_INSECURE_DEMO=on   # local only: the insecure backend the exploit demo uses

# v3/wallet/.env.local
NEXT_PUBLIC_RELAY_URL=http://127.0.0.1:8080
NEXT_PUBLIC_PROJECT_ID=c0ffee254729296a45a3885639ac7e10
```

Open Ember at `http://localhost:3001` and Nimbus at any of these, with no restart in between:

- `http://app.localhost:3000`: signed, Ember shows "Business verified";
- `http://other.localhost:3000`: signed, Ember shows the domain only (Domain verified);
- `http://scam.localhost:3000`: signed, Ember shows the "Known scam" warning;
- `http://unknown.localhost:3000`: not in the list, so unsigned, and Ember shows "Unverified app";
- `http://required.localhost:3000`: signed; switch App Signatures off and Nimbus's connection is refused, since the domain requires signatures;
- `http://<anything>.new.localhost:3000`: a new domain, for walking it up from unverified to Business verified.

### End-to-end tests

`v3/e2e` is a Playwright suite that drives Nimbus and Ember in a headless browser against the local stack: each status Ember shows, the upgrade from an unknown domain to Business verified (through the WalletConnect Dashboard), attacks that fail and attacks that succeed. Start the stack and both apps first, with the `.env.local` above.

```bash
cd v3/e2e && pnpm install && pnpm exec playwright install chromium
VERIFY_V4_LOCAL=<rs-relay>/scripts/verify-v4-local pnpm test
```

- `VERIFY_V4_LOCAL`: rs-relay's `scripts/verify-v4-local`, for its keys and the organization's IDs. Defaults to an rs-relay checkout next to this one. rs-relay's `scripts/verify-v4-local/browser.sh` runs the suite with it set.
- `DASHBOARD_PASSWORD` (and `DASHBOARD_EMAIL`, default `agent@walletconnect.invalid`): the local Dashboard's sign-in, for the upgrade test's Dashboard steps. Without it, that test refreshes the domain through the organization API instead, as the Dashboard does.
- `SCREENSHOTS=1` saves every screenshot to `v3/e2e/screenshots/`; they're in the HTML report (`pnpm exec playwright show-report`) either way.

| File | Covers |
|---|---|
| `tests/statuses.spec.ts` | Business verified, Domain verified, Default (unverified), Security risk, and the refusal on a domain requiring signatures |
| `tests/upgrade.spec.ts` | A new domain: unverified, then its domain file and a Dashboard refresh (Domain verified), then WalletConnect's review (Business verified), then a scam flag |
| `tests/exploits-fail.spec.ts` | An unpublished key, a `sub` over another request (refused by the Relay on Sign v3, dropped by the wallet on Sign v2), another domain's token from another Origin, an expired token, unsigned or garbage-signed Sign v2 from a domain requiring signatures, a short domain hijack, old wallets, and the real backend's policy |
| `tests/exploits-succeed.spec.ts` | Where the protection ends: a backend that signs anything, a compromised frontend, unsigned Sign v2 with no Origin from a script, and a hijack that lasts the whole hold |

## License

The vendored client in each app's `src/lib/sign-client-v3` is a build of `@walletconnect/sign-client/v3`, which is under the WalletConnect Community License: see the `LICENSE.md` and `NOTICE.md` next to it. Portions © 2025 Reown, Inc. All Rights Reserved.

## Notes

- **Storage.** Each app keeps its keys in `localStorage`, with one identity per project. The Relay keeps the project a client first registered with, so a switched identity would still count as its first one. **Reset** forgets an app's identities and sessions.
- **Keys.** Ember keeps one private key in `localStorage` under `demo-wallet-key`.
  - Account 2 is derived from it: `keccak256(key ‖ "ember/account/2")`.
  - If neither account is the sanctioned address, Ember adds it as a watch-only account.
- **Requests after a reload.** A request that arrived before Ember was reloaded drops off its list.
