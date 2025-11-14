import { NamespaceMetadata, ChainsMap } from "../types";

export const TezosMetadata: NamespaceMetadata = {
  mainnet: {
    logo: "/assets/tezos.svg",
    rgb: "44, 125, 247",
  },
  testnet: {
    logo: "/assets/tezos.svg",
    rgb: "44, 125, 247",
  },
};

export const TezosChainData: ChainsMap = {
  mainnet: {
    name: "Tezos",
    id: "tezos:mainnet",
    rpc: ["https://mainnet.api.tez.ie"],
    slip44: 1729,
    testnet: false,
  },
  testnet: {
    name: "Tezos Testnet",
    id: "tezos:testnet",
    rpc: ["https://ghostnet.ecadinfra.com"],
    slip44: 1729,
    testnet: true,
  },
};

export const DEFAULT_TEZOS_METHODS = {
  TEZOS_GET_ACCOUNTS: "tezos_getAccounts",
  TEZOS_SEND: "tezos_send",
  TEZOS_SIGN: "tezos_sign",
} as const;

export const DEFAULT_TEZOS_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const TezosUtils = {
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
