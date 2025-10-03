import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const TonChainData: ChainsMap = {
  "-239": {
    id: "ton:-239",
    name: "TON Mainnet",
    rpc: [],
    slip44: 607,
    testnet: false,
  },
  "-3": {
    id: "ton:-3",
    name: "TON Testnet",
    rpc: [],
    slip44: 607,
    testnet: true,
  },
};

export const TonMetadata: NamespaceMetadata = {
  "-239": {
    logo: "/assets/ton.png",
    rgb: "0, 153, 255",
  },
  "-3": {
    logo: "/assets/ton.png",
    rgb: "0, 153, 255",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = TonMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
