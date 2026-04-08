import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  ChainsMap,
} from "../helpers";

export const CantonChainData: ChainsMap = {
  mainnet: {
    name: "Canton Network",
    id: "canton:mainnet",
    rpc: [],
    slip44: 0,
    testnet: false,
  },
  devnet: {
    name: "Canton Devnet",
    id: "canton:devnet",
    rpc: [],
    slip44: 0,
    testnet: true,
  },
};

export const CantonMetadata: NamespaceMetadata = {
  mainnet: {
    logo: "/assets/canton-mainnet.png",
    rgb: "0, 122, 255",
  },
  devnet: {
    logo: "/assets/canton-mainnet.png",
    rgb: "0, 122, 255",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = CantonMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(
  request: JsonRpcRequest,
): ChainRequestRender[] {
  return [
    { label: "Method", value: request.method },
    {
      label: "params",
      value: JSON.stringify(request.params, null, "\t"),
    },
  ];
}
