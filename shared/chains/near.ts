import { NamespaceMetadata, ChainsMap } from "../types";

export const NearMetadata: NamespaceMetadata = {
  testnet: {
    logo: "https://avatars.githubusercontent.com/u/7613128?s=200&v=4",
    rgb: "27, 31, 53",
  },
};

export const NearChainData: ChainsMap = {
  "near:testnet": {
    name: "NEAR Testnet",
    id: "near:testnet",
    rpc: ["https://rpc.testnet.near.org"],
    slip44: 397,
    testnet: true,
  },
};

export type TNearChain = typeof NearChainData.testnet;

export const NEAR_TEST_CHAINS = { ...NearChainData };
export const NEAR_MAINNET_CHAINS = NearChainData;

export const DEFAULT_NEAR_METHODS = {
  NEAR_SIGN_IN: "near_signIn",
  NEAR_SIGN_OUT: "near_signOut",
  NEAR_GET_ACCOUNTS: "near_getAccounts",
  NEAR_SIGN_AND_SEND_TRANSACTION: "near_signAndSendTransaction",
  NEAR_SIGN_AND_SEND_TRANSACTIONS: "near_signAndSendTransactions",
  NEAR_SIGN_TRANSACTION: "near_signTransaction",
  NEAR_SIGN_TRANSACTIONS: "near_signTransactions",
} as const;

export const DEFAULT_NEAR_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const NearUtils = {
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
