import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const TezosMetadata: NamespaceMetadata = {
  mainnet: {
    logo: "/assets/tezos.svg",
    rgb: "44, 125, 247",
  },
  testnet: {
    logo: "/assets/tezos.svg",
    rgb: "44, 125, 247",
  },
};

export const TezosChainData: ChainsMap = {
  mainnet: {
    name: "Tezos",
    id: "tezos:mainnet",
    rpc: ["https://mainnet.api.tez.ie"],
    slip44: 1729,
    testnet: false,
  },
  testnet: {
    name: "Tezos Testnet",
    id: "tezos:testnet",
    rpc: ["https://ghostnet.ecadinfra.com"],
    slip44: 1729,
    testnet: true,
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = TezosMetadata[reference];
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
