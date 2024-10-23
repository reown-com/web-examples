import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const BtcChainData: ChainsMap = {
  "000000000933ea01ad0ee984209779ba": {
    id: "bip122:000000000933ea01ad0ee984209779ba",
    name: "BTC Testnet",
    rpc: [],
    slip44: 501,
    testnet: true,
  },
};

export const BtcMetadata: NamespaceMetadata = {
  "000000000933ea01ad0ee984209779ba": {
    logo: "/assets/btc-testnet.png",
    rgb: "247, 147, 25",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = BtcMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
