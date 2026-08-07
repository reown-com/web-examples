import { SuiJsonRpcClient, JsonRpcHTTPTransport } from "@mysten/sui/jsonRpc";
import { getProviderUrl } from "./utilities";

const clients = new Map<string, SuiJsonRpcClient>();

// The @mysten/sui HTTP transport attaches Client-Sdk-Type / Client-Sdk-Version /
// Client-Target-Api-Version / Client-Request-Method headers to every request.
// The WalletConnect Blockchain API's CORS policy does not allow those header
// names, so the browser rejects the preflight. They are informational only, so
// strip them here — only Content-Type (which is allowed) needs to survive.
const blockchainApiFetch: typeof fetch = (input, init) => {
  if (init?.headers) {
    const headers = new Headers(init.headers);
    [
      "client-sdk-type",
      "client-sdk-version",
      "client-target-api-version",
      "client-request-method",
    ].forEach((header) => headers.delete(header));
    init = { ...init, headers };
  }
  return fetch(input, init);
};

export function getSuiClient(chainId: string): SuiJsonRpcClient {
  if (clients.has(chainId)) {
    return clients.get(chainId)!;
  }
  // Route Sui JSON-RPC through the CORS-enabled WalletConnect Blockchain API.
  // The public Sui fullnodes (fullnode.*.sui.io) do not return CORS headers, so
  // calling them directly from the browser is blocked, which breaks balance
  // fetching and transaction building (tx.build needs the reference gas price).
  const transport = new JsonRpcHTTPTransport({
    url: getProviderUrl(chainId),
    fetch: blockchainApiFetch,
  });
  let client: SuiJsonRpcClient;
  switch (chainId) {
    case "sui:mainnet":
      client = new SuiJsonRpcClient({ network: "mainnet", transport });
      break;
    case "sui:testnet":
      client = new SuiJsonRpcClient({ network: "testnet", transport });
      break;
    case "sui:devnet":
      client = new SuiJsonRpcClient({ network: "devnet", transport });
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  clients.set(chainId, client);
  return client;
}
