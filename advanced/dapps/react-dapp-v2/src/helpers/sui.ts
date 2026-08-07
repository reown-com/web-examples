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
  const client = new SuiGraphQLClient({
    network,
    url: `https://graphql.${network}.sui.io/graphql`,
  });
  clients.set(chainId, client);
  return client;
}
