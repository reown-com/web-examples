import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const SUI_MAINNET = "mainnet";
export const SUI_TESTNET = "testnet";
export const SUI_DEVNET = "devnet";

export const SuiChainData: ChainsMap = {
  [SUI_MAINNET]: {
    id: `sui:${SUI_MAINNET}`,
    name: "SUI Mainnet",
    rpc: [],
    slip44: 0,
    testnet: false,
  },
  [SUI_TESTNET]: {
    id: `sui:${SUI_TESTNET}`,
    name: "SUI Testnet",
    rpc: [],
    slip44: 0,
    testnet: true,
  },
  [SUI_DEVNET]: {
    id: `sui:${SUI_DEVNET}`,
    name: "SUI Devnet",
    rpc: [],
    slip44: 0,
    testnet: true,
  },
};

export const SuiMetadata: NamespaceMetadata = {
  [SUI_MAINNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
  [SUI_TESTNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
  [SUI_DEVNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = SuiMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
