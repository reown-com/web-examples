import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import { NamespaceMetadata, ChainMetadata, ChainRequestRender } from "../helpers";

export const PolkadotMetadata: NamespaceMetadata = {
  // eslint-disable-next-line no-useless-computed-key
  ["91b171bb158e2d3848fa23a9f1c25182"]: {
    logo: "/assets/polkadot.svg",
    rgb: "230, 1, 122",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = PolkadotMetadata[reference];
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
