import { signVerify } from "@ton/crypto";
import { NamespaceMetadata, ChainsMap } from "../types";

export const TonChainData: ChainsMap = {
  "-239": {
    id: "ton:-239",
    name: "TON Mainnet",
    rpc: [],
    slip44: 607,
    testnet: false,
  },
  "-3": {
    id: "ton:-3",
    name: "TON Testnet",
    rpc: [],
    slip44: 607,
    testnet: true,
  },
};

export const TonMetadata: NamespaceMetadata = {
  "-239": {
    logo: "/assets/ton.png",
    rgb: "0, 153, 255",
  },
  "-3": {
    logo: "/assets/ton.png",
    rgb: "0, 153, 255",
  },
};

// Wallet-specific data structures
export type TTonChain =
  | keyof typeof TON_MAINNET_CHAINS
  | keyof typeof TON_TEST_CHAINS;

export const tonCenterRpc = (testnet: boolean) => {
  return testnet
    ? "https://ton-testnet.api.onfinality.io/public"
    : "https://toncenter.com/api/v2/jsonRPC";
};

export const TON_MAINNET_CHAINS = {
  "ton:-239": {
    chainId: "-239",
    name: "TON",
    logo: "/chain-logos/ton.png",
    rgb: "0, 136, 204",
    rpc: tonCenterRpc(false),
    namespace: "ton",
  },
} as const;

export const TON_TEST_CHAINS = {
  "ton:-3": {
    chainId: "-3",
    name: "TON Testnet",
    logo: "/chain-logos/ton.png",
    rgb: "0, 136, 204",
    rpc: tonCenterRpc(true),
    namespace: "ton",
  },
} as const;

export const TON_CHAINS = { ...TON_MAINNET_CHAINS, ...TON_TEST_CHAINS };

export const DEFAULT_TON_METHODS = {
  TON_SEND_MESSAGE: "ton_sendMessage",
  TON_SIGN_DATA: "ton_signData",
} as const;

export const DEFAULT_TON_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const TONUtils = {
  verifyMessage: async ({
    message,
    signature,
    publicKey,
  }: {
    message: string;
    signature: string;
    publicKey: string;
  }) => {
    const valid = await signVerify(
      Buffer.from(message, "utf-8"),
      Buffer.from(signature, "base64"),
      Buffer.from(publicKey, "base64")
    );
    return valid;
  },
};
