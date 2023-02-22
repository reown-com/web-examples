import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const ElrondChainData: ChainsMap = {
  "1": {
    id: "elrond:1",
    name: "Elrond Mainnet",
    rpc: ["https://api.elrond.com"],
    slip44: 508,
    testnet: false,
  },
  D: {
    id: "elrond:D",
    name: "Elrond Devnet",
    rpc: ["https://devnet-api.elrond.com"],
    slip44: 508,
    testnet: true,
  },
  // Keep only one Test Chain visible
  // T: {
  //   id: "elrond:T",
  //   name: "Elrond Testnet",
  //   rpc: ["https://testnet-api.elrond.com"],
  //   slip44: 508,
  //   testnet: true,
  // },
};

export const ElrondMetadata: NamespaceMetadata = {
  // Elrond Mainnet
  "1": {
    logo: "/assets/elrond_logo.png",
    rgb: "0, 0, 0",
  },
  // Elrond Testnet
  T: {
    logo: "/assets/elrond_logo.png",
    rgb: "0, 0, 0",
  },
  // Elrond Devnet
  D: {
    logo: "/assets/elrond_logo.png",
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
