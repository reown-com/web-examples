import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const XrplChainData: ChainsMap = {
  "0": {
    name: "XRPL",
    id: "xrpl:0",
    rpc: ["https://xrplcluster.com/", "https://s2.ripple.com:51234/"],
    slip44: 144,
    testnet: false,
  },
  "1": {
    name: "XRPL Testnet",
    id: "xrpl:1",
    rpc: [
      "https://testnet.xrpl-labs.com",
      "https://s.altnet.rippletest.net:51234/",
    ],
    slip44: 144,
    testnet: true,
  },
};

export const XrplMetadata: NamespaceMetadata = {
  "0": {
    logo: "/assets/xrpl-logo.svg",
    rgb: "27, 31, 53",
  },
  "1": {
    logo: "/assets/xrpl-logo.svg",
    rgb: "27, 31, 53",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = XrplMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(
  request: JsonRpcRequest
): ChainRequestRender[] {
  let params = [{ label: "Method", value: request.method }];

  switch (request.method) {
    default:
      params = [
        ...params,
        {
          label: "params",
          value: JSON.stringify(request.params, null, "\t"),
        },
      ];
      break;
  }
  return params;
}
