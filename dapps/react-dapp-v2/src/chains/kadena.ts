import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const KadenaMetadata: NamespaceMetadata = {
  mainnet01: {
    logo: "/assets/kadena.png",
    rgb: "237, 9, 143",
  },
  testnet04: {
    logo: "/assets/kadena.png",
    rgb: "237, 9, 143",
  },
};

// TODO: add `kadena` namespace to `caip-api` package to avoid manual specification here.
export const KadenaChainData: ChainsMap = {
  mainnet01: {
    name: "Kadena",
    id: "kadena:mainnet01",
    rpc: ["https://api.chainweb.com"],
    slip44: 626,
    testnet: false,
  },
  testnet04: {
    name: "Kadena Testnet",
    id: "kadena:testnet04",
    rpc: ["https://api.chainweb.com"],
    slip44: 626,
    testnet: true,
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = KadenaMetadata[reference];
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
