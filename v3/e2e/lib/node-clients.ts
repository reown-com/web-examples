// Sign clients outside the browser, as an attacker's script or an old wallet would run them. Node
// sends no Origin header, so the relay can't tell which domain an unsigned request claims.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_ID, RELAY_URL } from "./stack";

const here = dirname(fileURLToPath(import.meta.url));

/** The v2-era SDK wallets run today: `@walletconnect/sign-client` 2.21, from npm. Sign v2 over the
 * WebSocket only, with the legacy `verifyContext`. */
export const OldSignClient = createRequire(join(here, "..", "package.json"))(
  "@walletconnect/sign-client",
).SignClient as any;

/** The SDK Nimbus runs: the Verify v4 build installed in v3/dapp (scripts/use-local-sdk.sh), with
 * Sign v3 and App Signatures. */
export const NewSignClient = createRequire(
  join(here, "..", "..", "dapp", "package.json"),
)("@walletconnect/sign-client").SignClient as any;

const memory = () => {
  const m = new Map<string, unknown>();
  return {
    getKeys: async () => [...m.keys()],
    getEntries: async () => [...m.entries()],
    getItem: async (k: string) => m.get(k),
    setItem: async (k: string, v: unknown) => void m.set(k, v),
    removeItem: async (k: string) => void m.delete(k),
  };
};

export const metadata = (name: string, url: string) => ({
  name,
  description: name,
  url,
  icons: [`${url}/icon.png`],
});

/** An old (v2-era) client over the relay's WebSocket. */
export function oldClient(name: string, url = "https://example.invalid") {
  return OldSignClient.init({
    projectId: PROJECT_ID,
    relayUrl: RELAY_URL.replace(/^http/, "ws"),
    metadata: metadata(name, url),
    customStoragePrefix: `${name}-${Date.now()}`,
    storage: memory(),
    logger: "silent",
  });
}

/** A current client, with an App Signature callback if given. */
export function newClient(
  name: string,
  url: string,
  appSignature?: (p: {
    request: unknown;
    requestJson: string;
  }) => Promise<{ appSignature: string }>,
) {
  return NewSignClient.init({
    projectId: PROJECT_ID,
    relayUrl: RELAY_URL,
    metadata: metadata(name, url),
    customStoragePrefix: `${name}-${Date.now()}`,
    storage: memory(),
    logger: "silent",
    ...(appSignature ? { appSignature: { callback: appSignature } } : {}),
  });
}

export const namespaces = {
  eip155: {
    chains: ["eip155:1"],
    methods: ["personal_sign", "eth_sendTransaction"],
    events: [],
  },
};
