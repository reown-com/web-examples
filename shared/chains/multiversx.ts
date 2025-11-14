import { NamespaceMetadata, ChainsMap } from "../types";

export const MultiversxChainData: ChainsMap = {
  "1": {
    id: "mvx:1",
    name: "MultiversX Mainnet",
    rpc: ["https://api.multiversx.com"],
    slip44: 508,
    testnet: false,
  },
  D: {
    id: "mvx:D",
    name: "MultiversX Devnet",
    rpc: ["https://devnet-api.multiversx.com"],
    slip44: 508,
    testnet: true,
  },
  // Keep only one Test Chain visible
  // T: {
  //   id: "mvx:T",
  //   name: "MultiversX Testnet",
  //   rpc: ["https://testnet-api.multiversx.com"],
  //   slip44: 508,
  //   testnet: true,
  // },
};

export const MultiversxMetadata: NamespaceMetadata = {
  // MultiversX Mainnet
  "1": {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
  // MultiversX Testnet
  T: {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
  // MultiversX Devnet
  D: {
    logo: "/assets/multiversx_logo.svg",
    rgb: "0, 0, 0",
  },
};

export const DEFAULT_MULTIVERSX_METHODS = {
  MULTIVERSX_SIGN_TRANSACTION: "mvx_signTransaction",
  MULTIVERSX_SIGN_TRANSACTIONS: "mvx_signTransactions",
  MULTIVERSX_SIGN_MESSAGE: "mvx_signMessage",
} as const;

export const DEFAULT_MULTIVERSX_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const MultiversxUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
  }: {
    message: string;
    signature: string;
    address: string;
  }) => {
    return true;
  },
};
