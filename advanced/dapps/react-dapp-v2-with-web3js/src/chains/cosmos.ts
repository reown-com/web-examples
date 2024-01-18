import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import { NamespaceMetadata, ChainMetadata, ChainRequestRender } from "../helpers";

export const CosmosMetadata: NamespaceMetadata = {
  "cosmoshub-4": {
    logo: "/assets/" + "cosmos-cosmoshub-4.png",
    rgb: "27, 31, 53",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = CosmosMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(request: JsonRpcRequest): ChainRequestRender[] {
  return [
    { label: "Method", value: request.method },
    {
      label: "params",
      value: JSON.stringify(request.params, null, "\t"),
    },
  ];
}
