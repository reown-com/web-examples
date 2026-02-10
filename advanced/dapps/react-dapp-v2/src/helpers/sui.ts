import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

const clients = new Map<string, SuiJsonRpcClient>();

export function getSuiClient(chainId: string): SuiJsonRpcClient {
  if (clients.has(chainId)) {
    return clients.get(chainId)!;
  }
  let client: SuiJsonRpcClient;
  switch (chainId) {
    case "sui:mainnet":
      client = new SuiJsonRpcClient({ network: "mainnet", url: "https://fullnode.mainnet.sui.io/" });
      break;
    case "sui:testnet":
      client = new SuiJsonRpcClient({ network: "testnet", url: "https://fullnode.testnet.sui.io/" });
      break;
    case "sui:devnet":
      client = new SuiJsonRpcClient({ network: "devnet", url: "https://fullnode.devnet.sui.io/" });
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  clients.set(chainId, client);
  return client;
}
