import { PublicKey } from "@solana/web3.js";
import { verifyMessageSignature } from "solana-wallet";
import bs58 from "bs58";

import { NamespaceMetadata, ChainsMap } from "../types";

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

// Wallet-specific data structures
export type TSolanaChain = keyof typeof SOLANA_MAINNET_CHAINS;

export const SOLANA_MAINNET_CHAINS = {
  "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ": {
    chainId: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
    name: "Solana (Legacy)",
    logo: "/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png",
    rgb: "30, 240, 166",
    rpc: "",
    namespace: "solana",
  },
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    chainId: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    name: "Solana",
    logo: "/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png",
    rgb: "30, 240, 166",
    rpc: "https://api.mainnet-beta.solana.com",
    namespace: "solana",
  },
} as const;

export const SOLANA_TEST_CHAINS = {
  "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K": {
    chainId: "8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
    name: "Solana Devnet (Legacy)",
    logo: "/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png",
    rgb: "30, 240, 166",
    rpc: "",
    namespace: "solana",
  },
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
    chainId: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    name: "Solana Devnet",
    logo: "/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png",
    rgb: "30, 240, 166",
    rpc: "https://api.devnet.solana.com",
    namespace: "solana",
  },
  "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": {
    chainId: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
    name: "Solana Testnet",
    logo: "/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png",
    rgb: "30, 240, 166",
    rpc: "https://api.testnet.solana.com",
    namespace: "solana",
  },
} as const;

export const SOLANA_CHAINS = {
  ...SOLANA_MAINNET_CHAINS,
  ...SOLANA_TEST_CHAINS,
};

export const DEFAULT_SOLANA_METHODS = {
  SOL_SIGN_TRANSACTION: "solana_signTransaction",
  SOL_SIGN_MESSAGE: "solana_signMessage",
  SOL_SIGN_AND_SEND_TRANSACTION: "solana_signAndSendTransaction",
  SOL_SIGN_ALL_TRANSACTIONS: "solana_signAllTransactions",
} as const;

export const DEFAULT_SOLANA_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const SolanaUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
  }: {
    message: string;
    signature: string;
    address: string;
  }) => {
    const senderPublicKey = new PublicKey(address);
    const valid = verifyMessageSignature(
      senderPublicKey.toBase58(),
      signature,
      bs58.encode(new Uint8Array(Buffer.from(message)))
    );
    return valid;
  },
};
