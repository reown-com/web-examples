import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const StacksChainData: ChainsMap = {
  "1": {
    id: "stacks:1",
    name: "Stacks Mainnet",
    rpc: [],
    slip44: 195,
    testnet: false,
  },
  "2147483648": {
    id: "stacks:2147483648",
    name: "Stacks Testnet",
    rpc: [],
    slip44: 195,
    testnet: true,
  },
};

export const StacksMetadata: NamespaceMetadata = {
  // Stacks Mainnet
  "1": {
    logo: "/assets/stacks.png",
    rgb: "85, 70, 254",
  },
  // Stacks TestNet
  "2147483648": {
    logo: "/assets/stacks.png",
    rgb: "85, 70, 254",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = StacksMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
