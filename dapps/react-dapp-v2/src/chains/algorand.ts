import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
    NamespaceMetadata,
    ChainMetadata,
    ChainRequestRender,
    ChainsMap,
  } from "../helpers";
  
export const AlgorandMetadata: NamespaceMetadata = {
    mainnet: {
        logo: "/assets/Algorand.svg",
        rgb: "44, 125, 247",
      },
      testnet: {
        logo: "/assets/Algorand.svg",
        rgb: "44, 125, 247",
      },
};


export const AlgorandChainData: ChainsMap = {
    mainnet: {
      name: "Algorand",
      id: "Algorand:mainnet",
      rpc: [""],
      slip44: 1729,
      testnet: false,
    },
    testnet: {
      name: "Algorand Testnet",
      id: "Algorand:testnet",
      rpc: [""],
      slip44: 1729,
      testnet: true,
    },
  };


  export function getChainMetadata(chainId: string): ChainMetadata {
    const reference = chainId.split(":")[1];
    const metadata = AlgorandMetadata[reference];
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
