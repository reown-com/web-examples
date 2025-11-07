import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const TronChainData: ChainsMap = {
  "0x2b6653dc": {
    id: "tron:0x2b6653dc",
    name: "Tron Mainnet",
    rpc: [],
    slip44: 195,
    testnet: false,
  },
  "0xcd8690dc": {
    id: "tron:0xcd8690dc",
    name: "Tron Testnet",
    rpc: [],
    slip44: 195,
    testnet: true,
  },
};

export const TronMetadata: NamespaceMetadata = {
  // Tron Mainnet
  "0x2b6653dc": {
    logo: "/assets/tron.png",
    rgb: "183, 62, 49",
  },
  // Tron TestNet
  "0xcd8690dc": {
    logo: "assets/tron.png",
    rgb: "183, 62, 49",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = TronMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
