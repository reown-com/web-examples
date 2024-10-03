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
  ghostnet: {
    logo: "/assets/tezos.svg",
    rgb: "44, 125, 247",
  },
};

export const TezosChainData: ChainsMap = {
  mainnet: {
    name: "Tezos",
    id: "tezos:mainnet",
    rpc: ["https://rpc.tzbeta.net"],
    indexer: "https://api.tzkt.io/v1",
    slip44: 1729,
    testnet: false,
  },
  ghostnet: {
    name: "Tezos Ghostnet",
    id: "tezos:ghostnet",
    rpc: ["https://rpc.ghostnet.teztnets.com"],
    indexer: "https://api.ghostnet.tzkt.io/v1",
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
  return [
    { label: "Method", value: request.method },
    {
      label: "params",
      value: JSON.stringify(request.params, null, "\t"),
    },
  ];
}
