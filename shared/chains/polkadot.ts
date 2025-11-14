import { signatureVerify, cryptoWaitReady } from "@polkadot/util-crypto";
import { NamespaceMetadata, ChainsMap } from "../types";

export const PolkadotChainData: ChainsMap = {
  ["91b171bb158e2d3848fa23a9f1c25182"]: {
    id: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
    name: "Polkadot Mainnet",
    rpc: ["wss://rpc.polkadot.io"],
    slip44: 0,
    testnet: false,
  },
  ["e143f23803ac50e8f6f8e62695d1ce9e"]: {
    id: "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
    name: "Polkadot Testnet (Westend)",
    rpc: ["wss://westend-rpc.polkadot.io"],
    slip44: 0,
    testnet: false,
  },
};

export const PolkadotMetadata: NamespaceMetadata = {
  // eslint-disable-next-line no-useless-computed-key
  ["91b171bb158e2d3848fa23a9f1c25182"]: {
    logo: "/assets/polkadot.svg",
    rgb: "230, 1, 122",
  },
  ["e143f23803ac50e8f6f8e62695d1ce9e"]: {
    logo: "/assets/westend-logo.svg",
    rgb: "218, 104, 167",
  },
};

export const DEFAULT_POLKADOT_METHODS = {
  POLKADOT_SIGN_TRANSACTION: "polkadot_signTransaction",
  POLKADOT_SIGN_MESSAGE: "polkadot_signMessage",
} as const;

export const DEFAULT_POLKADOT_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const PolkadotUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
  }: {
    message: string;
    signature: string;
    address: string;
  }) => {
    await cryptoWaitReady();
    const result = signatureVerify(message, signature, address);
    return result.isValid;
  },
};
