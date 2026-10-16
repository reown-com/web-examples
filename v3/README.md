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

## Configuration

All settings are optional. See `.env.local.example` in each app.
- **`NEXT_PUBLIC_RELAY_URL`:** a Relay that speaks Sign v3. Defaults to the dev Relay, `https://pool-1.dev-relay.walletconnect.com`; production doesn't speak v3 yet.
- **`NEXT_PUBLIC_PROJECT_ID`:** the default project, `sign-v3-demo`.
- **`NEXT_PUBLIC_WALLET_URL`:** dApp only, where "Open Ember Wallet" points. Defaults to `http://localhost:3001`.

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
