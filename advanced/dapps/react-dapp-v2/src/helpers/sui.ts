import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getProviderUrl } from "./utilities";

const clients = new Map<string, SuiJsonRpcClient>();

export function getSuiClient(chainId: string): SuiJsonRpcClient {
  if (clients.has(chainId)) {
    return clients.get(chainId)!;
  }
  // Route Sui JSON-RPC through the CORS-enabled WalletConnect Blockchain API.
  // The public Sui fullnodes (fullnode.*.sui.io) do not return CORS headers, so
  // calling them directly from the browser is blocked, which breaks balance
  // fetching and transaction building (tx.build needs the reference gas price).
  const url = getProviderUrl(chainId);
  let client: SuiJsonRpcClient;
  switch (chainId) {
    case "sui:mainnet":
      client = new SuiJsonRpcClient({ network: "mainnet", url });
      break;
    case "sui:testnet":
      client = new SuiJsonRpcClient({ network: "testnet", url });
      break;
    case "sui:devnet":
      client = new SuiJsonRpcClient({ network: "devnet", url });
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  clients.set(chainId, client);
  return client;
}
