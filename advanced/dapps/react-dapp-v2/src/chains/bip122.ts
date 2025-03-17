import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const BIP122_MAINNET = "000000000019d6689c085ae165831e93";
export const BIP122_TESTNET = "000000000933ea01ad0ee984209779ba";
export const BIP122_DUST_LIMIT = "1001";

export const BtcChainData: ChainsMap = {
  [BIP122_MAINNET]: {
    id: `bip122:${BIP122_MAINNET}`,
    name: "BTC Mainnet",
    rpc: [],
    slip44: 0,
    testnet: false,
  },
  [BIP122_TESTNET]: {
    id: `bip122:${BIP122_TESTNET}`,
    name: "BTC Testnet",
    rpc: [],
    slip44: 501,
    testnet: true,
  },
};

export const BtcMetadata: NamespaceMetadata = {
  [BIP122_MAINNET]: {
    logo: "/assets/btc-testnet.png",
    rgb: "247, 147, 25",
  },
  [BIP122_TESTNET]: {
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
