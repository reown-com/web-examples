import { SuiClient } from "@mysten/sui/client";

// Cache clients
const clients = new Map<string, SuiClient>();

export async function getSuiClient(chainId: string) {
  if (clients.has(chainId)) {
    return clients.get(chainId);
  }
  let client: SuiClient;
  switch (chainId) {
    case "sui:mainnet":
      client = new SuiClient({ url: "https://fullnode.mainnet.sui.io/" });
      break;
    case "sui:testnet":
      client = new SuiClient({ url: "https://fullnode.testnet.sui.io/" });
      break;
    case "sui:devnet":
      client = new SuiClient({ url: "https://fullnode.devnet.sui.io/" });
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  clients.set(chainId, client);
  return client;
}
