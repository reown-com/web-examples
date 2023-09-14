import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const MultiversxChainData: ChainsMap = {
  "1": {
    id: "mvx:1",
    name: "MultiversX Mainnet",
    rpc: ["https://api.multiversx.com"],
    slip44: 508,
    testnet: false,
  },
  D: {
    id: "mvx:D",
    name: "MultiversX Devnet",
    rpc: ["https://devnet-api.multiversx.com"],
    slip44: 508,
    testnet: true,
  },
  // Keep only one Test Chain visible
  // T: {
  //   id: "mvx:T",
  //   name: "MultiversX Testnet",
  //   rpc: ["https://testnet-api.multiversx.com"],
  //   slip44: 508,
  //   testnet: true,
  // },
};

export const MultiversxMetadata: NamespaceMetadata = {
  // MultiversX Mainnet
  "1": {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
  // MultiversX Testnet
  T: {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
  // MultiversX Devnet
  D: {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = MultiversxMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
