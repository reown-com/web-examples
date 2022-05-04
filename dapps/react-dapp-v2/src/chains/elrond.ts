import { ChainsMap } from "caip-api";
import { NamespaceMetadata, ChainMetadata } from "../helpers";

// TODO: add `elrond` namespace to `caip-api` package to avoid manual specification here.
export const ElrondChainData: ChainsMap = {
  M: {
    id: "elrond:1",
    name: "Elrond Mainnet",
    rpc: ["https://api.elrond.com"],
    slip44: 508,
    testnet: false,
  },
  T: {
    id: "elrond:T",
    name: "Elrond Testnet",
    rpc: ["https://testnet-api.elrond.com"],
    slip44: 508,
    testnet: true,
  },
};

export const ElrondMetadata: NamespaceMetadata = {
  // Elrond Mainnet
  M: {
    logo: "/elrond_logo.png",
    rgb: "0, 0, 0",
  },
  // Elrond Testnet
  T: {
    logo: "/elrond_logo.png",
    rgb: "0, 0, 0",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = ElrondMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
