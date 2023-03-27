import { ChainMetadata, ChainsMap, NamespaceMetadata } from "../helpers";

export const StarkNetChainData: ChainsMap = {
  SN_MAIN: {
    id: "starknet:SN_MAIN",
    name: "StarkNet Mainnet",
    rpc: [
      "https://starknet-mainnet.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    ],
    slip44: 9004,
    testnet: false,
  },
  SN_GOERLI: {
    id: "starknet:SN_GOERLI",
    name: "StarkNet Goerli",
    rpc: [
      "https://starknet-goerli.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    ],
    slip44: 9004,
    testnet: true,
  },
};

export const StarkNetMetadata: NamespaceMetadata = {
  // StarkNet Mainnet
  SN_MAIN: {
    logo: "/assets/starknet_logo.png",
    rgb: "0, 0, 0",
  },
  // StarkNet goerli alpha
  SN_GOERLI: {
    logo: "/assets/starknet_logo.png",
    rgb: "0, 0, 0",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = StarkNetMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
