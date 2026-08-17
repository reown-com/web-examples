import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

// Stellar SLIP-44 coin type is 148.
export const StellarChainData: ChainsMap = {
  pubnet: {
    id: "stellar:pubnet",
    name: "Stellar",
    rpc: ["https://horizon.stellar.org"],
    slip44: 148,
    testnet: false,
  },
  testnet: {
    id: "stellar:testnet",
    name: "Stellar Testnet",
    rpc: ["https://horizon-testnet.stellar.org"],
    slip44: 148,
    testnet: true,
  },
};

export const StellarMetadata: NamespaceMetadata = {
  // Stellar Mainnet (pubnet)
  pubnet: {
    logo: "/assets/stellar_logo.png",
    rgb: "15, 15, 15",
  },
  // Stellar Testnet
  testnet: {
    logo: "/assets/stellar_logo.png",
    rgb: "15, 15, 15",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = StellarMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
