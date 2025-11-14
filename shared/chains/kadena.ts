import { NamespaceMetadata, ChainsMap } from "../types";

export const KadenaMetadata: NamespaceMetadata = {
  mainnet01: {
    logo: "/assets/kadena.png",
    rgb: "237, 9, 143",
  },
  testnet04: {
    logo: "/assets/kadena.png",
    rgb: "237, 9, 143",
  },
};

// TODO: add `kadena` namespace to `caip-api` package to avoid manual specification here.
export const KadenaChainData: ChainsMap = {
  mainnet01: {
    name: "Kadena",
    id: "kadena:mainnet01",
    rpc: ["https://api.chainweb.com"],
    slip44: 626,
    testnet: false,
  },
  testnet04: {
    name: "Kadena Testnet",
    id: "kadena:testnet04",
    rpc: ["https://api.chainweb.com"],
    slip44: 626,
    testnet: true,
  },
};

export const DEFAULT_KADENA_METHODS = {
  KADENA_GET_ACCOUNTS: "kadena_getAccounts_v1",
  KADENA_SIGN: "kadena_sign_v1",
  KADENA_QUICKSIGN: "kadena_quicksign_v1",
} as const;

export const DEFAULT_KADENA_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;
