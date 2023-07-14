import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const NearMetadata: NamespaceMetadata = {
  testnet: {
    logo: "https://avatars.githubusercontent.com/u/7613128?s=200&v=4",
    rgb: "27, 31, 53",
  },
};

export const NearChainData: ChainsMap = {
  testnet: {
    name: "NEAR Testnet",
    id: "near:testnet",
    rpc: ["https://rpc.testnet.near.org"],
    slip44: 397,
    testnet: true,
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = NearMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(
  request: JsonRpcRequest
): ChainRequestRender[] {
  return [
    { label: "Method", value: request.method },
    {
      label: "params",
      value: JSON.stringify(request.params, null, "\t"),
    },
  ];
}
