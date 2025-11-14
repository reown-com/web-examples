import {
  getAddressFromPublicKey,
  publicKeyFromSignatureRsv,
} from "@stacks/transactions";
import { sha256 } from "@noble/hashes/sha2";
import { NamespaceMetadata, ChainsMap } from "../types";

export const StacksChainData: ChainsMap = {
  "1": {
    id: "stacks:1",
    name: "Stacks Mainnet",
    rpc: ["https://stacks-node-api.mainnet.stacks.co"],
    slip44: 5757,
    testnet: false,
  },
  "2147483648": {
    id: "stacks:2147483648",
    name: "Stacks Testnet",
    rpc: ["https://stacks-node-api.testnet.stacks.co"],
    slip44: 5757,
    testnet: true,
  },
};

export const StacksMetadata: NamespaceMetadata = {
  "1": {
    logo: "/assets/stacks.png",
    rgb: "88, 86, 214",
  },
  "2147483648": {
    logo: "/assets/stacks.png",
    rgb: "88, 86, 214",
  },
};

// Wallet-specific data structures
export const STACKS_NAMESPACE = "stacks";

export const STACKS_MAINNET_ID = "1";
export const STACKS_TESTNET_ID = "2147483648";
export const STACKS_MAINNET_CAIP2 = `${STACKS_NAMESPACE}:${STACKS_MAINNET_ID}`;
export const STACKS_TESTNET_CAIP2 = `${STACKS_NAMESPACE}:${STACKS_TESTNET_ID}`;

export type IStacksChainId =
  | typeof STACKS_MAINNET_CAIP2
  | typeof STACKS_TESTNET_CAIP2;

export const STACKS_MAINNET = {
  [STACKS_MAINNET_CAIP2]: {
    chainId: STACKS_MAINNET_ID,
    name: "Stacks Mainnet",
    logo: "/chain-logos/stacks.png",
    rgb: "107, 111, 147",
    rpc: "",
    coinType: "0",
    caip2: STACKS_MAINNET_CAIP2 as IStacksChainId,
    namespace: STACKS_NAMESPACE,
  },
};

export const STACKS_TESTNET = {
  [STACKS_TESTNET_CAIP2]: {
    chainId: STACKS_TESTNET_ID,
    name: "Stacks Testnet",
    logo: "/chain-logos/stacks.png",
    rgb: "107, 111, 147",
    rpc: "",
    coinType: "1",
    caip2: STACKS_TESTNET_CAIP2 as IStacksChainId,
    namespace: STACKS_NAMESPACE,
  },
};

export const STACKS_CHAINS = { ...STACKS_MAINNET, ...STACKS_TESTNET } as Record<
  IStacksChainId,
  (typeof STACKS_MAINNET)[typeof STACKS_MAINNET_CAIP2] &
    (typeof STACKS_TESTNET)[typeof STACKS_TESTNET_CAIP2]
>;

export const DEFAULT_STACKS_METHODS = {
  STACKS_SEND_TRANSFER: "stx_transferStx",
  STACKS_SIGN_MESSAGE: "stx_signMessage",
} as const;

export const DEFAULT_STACKS_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const StacksUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
    chainId,
  }: {
    message: string;
    signature: string;
    address: string;
    chainId: string;
  }) => {
    const network =
      chainId === "stacks:1" || chainId === "1" ? "mainnet" : "testnet";
    const hash = Buffer.from(sha256(message)).toString("hex");
    const pubKey = publicKeyFromSignatureRsv(hash, signature);

    const valid = getAddressFromPublicKey(pubKey, network) === address;
    return valid;
  },
};
