# Sign v3 examples

Two Next.js apps on the Sign v3 protocol:
- **Nimbus**, in `dapp/`, is the dApp.
- **Ember**, in `wallet/`, is the wallet.

Both use `@walletconnect/sign-client/v3`, which is v2's `SignClient` API over the Sign v3 Rust SDK, with the WASM embedded. The client is vendored in each app's source, at `src/lib/sign-client-v3`, so nothing about it comes from npm. It's an experimental, unpublished build.

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
- **The JWT.** ES256, with the key in `APP_SIGNATURE_PRIVATE_JWK`. The claims are `iss`, the host; `sub`, base64url SHA-256 of the request JSON exactly as the SDK sends it; `cth`, the SDK's `ciphertextHash`, whenever it gives one (sealed Sign v3 messages, and every Sign v2 message, where it covers the published envelope); and `exp`, 5 minutes.

**Ember.** It shows who sent a proposal, request or session from the SDK's `verification` only, never from the dApp's own name, URL or icon, which the SDK no longer exposes to wallets. It renders whatever is present:

- **the domain,** when the dApp's signature checked out;
- **the name and icon,** when WalletConnect reviewed the app;
- **a "✓ Verified" badge** when `isVerified`;
- **warning banners** for `isScam` and `isSimilarTo`, whatever else is present.

An unsigned request, or one over Sign v2, shows as "Unverified app". A request whose signature is for another request never reaches Ember: the SDK drops it and answers Nimbus with an error.

Nimbus signs its Sign v2 traffic too (the fallback offer and requests on a v2 session), so wallets on older SDKs can see it as verified through the Relay's legacy attestation.

**Run it against a Relay dev slot:**

1. Make a key pair for the host the dApp runs on:
   ```bash
   cd v3/dapp && node scripts/app-signature-keys.mjs localhost
   ```
   It prints three things:
   - the dApp's env, for `v3/dapp/.env.local`;
   - `wc-domain-validate.json`, `{ allowed_organizations, keys }`, for `https://<host>/.well-known/`;
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
- **`NEXT_PUBLIC_APP_SIGNATURE`:** dApp only, `on` to sign with the backend, which then needs `APP_SIGNATURE_PRIVATE_JWK`. `APP_SIGNATURE_DOMAIN` sets `iss`; it defaults to the request's host.

## Deploying to Vercel

Make one Vercel project per app, with **Root Directory** set to `v3/dapp` or `v3/wallet`. The framework is detected as Next.js. On the dApp, set `NEXT_PUBLIC_WALLET_URL` to the wallet's URL.

## Updating the vendored client

The vendored files carry a first-line comment naming the walletconnect-monorepo commit and engine they came from. To refresh them:

```bash
# in walletconnect-monorepo
npm run build -w @walletconnect/sign-client
# in web-examples
v3/scripts/vendor-sign-client.sh      # MONOREPO_DIR defaults to ../walletconnect-monorepo
```

## License

The vendored client in each app's `src/lib/sign-client-v3` is a build of `@walletconnect/sign-client/v3`, which is under the WalletConnect Community License: see the `LICENSE.md` and `NOTICE.md` next to it. Portions © 2025 Reown, Inc. All Rights Reserved.

## Notes

- **Storage.** Each app keeps its keys in `localStorage`, with one identity per project. The Relay keeps the project a client first registered with, so a switched identity would still count as its first one. **Reset** forgets an app's identities and sessions.
- **Keys.** Ember keeps one private key in `localStorage` under `demo-wallet-key`.
  - Account 2 is derived from it: `keccak256(key ‖ "ember/account/2")`.
  - If neither account is the sanctioned address, Ember adds it as a watch-only account.
- **Requests after a reload.** A request that arrived before Ember was reloaded drops off its list.
