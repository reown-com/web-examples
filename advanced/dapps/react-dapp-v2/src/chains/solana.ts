import { NamespaceMetadata, ChainMetadata, ChainsMap } from "../helpers";

export const SolanaChainData: ChainsMap = {
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    name: "Solana Mainnet",
    rpc: [
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
    ],
    slip44: 501,
    testnet: false,
  },
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1: {
    id: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    name: "Solana Devnet",
    rpc: ["https://api.devnet.solana.com"],
    slip44: 501,
    testnet: true,
  },
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": {
    id: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
    name: "Solana Testnet",
    rpc: ["https://api.testnet.solana.com"],
    slip44: 501,
    testnet: true,
  },
};

export const SolanaMetadata: NamespaceMetadata = {
  // Solana Mainnet
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    logo: "/assets/solana_logo.png",
    rgb: "0, 0, 0",
  },
  // Solana Devnet
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1: {
    logo: "/assets/solana_logo.png",
    rgb: "0, 0, 0",
  },
  // Solana Testnet
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": {
    logo: "/assets/solana_logo.png",
    rgb: "0, 0, 0",
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = SolanaMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
