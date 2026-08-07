import { SuiGraphQLClient } from "@mysten/sui/graphql";

const clients = new Map<string, SuiGraphQLClient>();

const SUI_NETWORKS: Record<string, "mainnet" | "testnet" | "devnet"> = {
  "sui:mainnet": "mainnet",
  "sui:testnet": "testnet",
  "sui:devnet": "devnet",
};

export function getSuiClient(chainId: string): SuiGraphQLClient {
  if (clients.has(chainId)) {
    return clients.get(chainId)!;
  }
  const network = SUI_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Unknown chainId: ${chainId}`);
  }
  // Sui disabled JSON-RPC on its public fullnodes (2026-07-27), so the SDK's
  // SuiJsonRpcClient no longer works. Use the GraphQL RPC — the recommended
  // browser/frontend replacement — which is CORS-enabled out of the box.
  // https://docs.sui.io/develop/accessing-data/json-rpc-migration
  const client = new SuiGraphQLClient({
    network,
    url: `https://graphql.${network}.sui.io/graphql`,
  });
  clients.set(chainId, client);
  return client;
}
