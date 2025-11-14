import { NamespaceMetadata, ChainsMap } from "../types";

export const CosmosChainData: ChainsMap = {
  "cosmoshub-4": {
    name: "Cosmos Hub",
    id: "cosmos:cosmoshub-4",
    rpc: ["https://rpc.cosmos.network"],
    slip44: 118,
    testnet: false,
  },
  "irishub-1": {
    name: "Irisnet",
    id: "cosmos:irishub-1",
    rpc: ["https://rpc.irisnet.org"],
    slip44: 566,
    testnet: false,
  },
  "kava-4": {
    name: "Kava",
    id: "cosmos:kava-4",
    rpc: ["https://kava4.data.kava.io"],
    slip44: 459,
    testnet: false,
  },
  "columbus-4": {
    name: "Terra",
    id: "cosmos:columbus-4",
    rpc: [],
    slip44: 330,
    testnet: false,
  },
};

export const CosmosMetadata: NamespaceMetadata = {
  "cosmoshub-4": {
    logo: "/assets/" + "cosmos-cosmoshub-4.png",
    rgb: "27, 31, 53",
  },
};

export const DEFAULT_COSMOS_METHODS = {
  COSMOS_SIGN_DIRECT: "cosmos_signDirect",
  COSMOS_SIGN_AMINO: "cosmos_signAmino",
} as const;

export const DEFAULT_COSMOS_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const CosmosUtils = {};
