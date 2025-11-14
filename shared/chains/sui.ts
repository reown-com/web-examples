import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { NamespaceMetadata, ChainsMap } from "../types";

export const SUI_MAINNET = "mainnet";
export const SUI_TESTNET = "testnet";
export const SUI_DEVNET = "devnet";

export const SuiChainData: ChainsMap = {
  [SUI_MAINNET]: {
    id: `sui:${SUI_MAINNET}`,
    name: "SUI Mainnet",
    rpc: [],
    slip44: 0,
    testnet: false,
  },
  [SUI_TESTNET]: {
    id: `sui:${SUI_TESTNET}`,
    name: "SUI Testnet",
    rpc: [],
    slip44: 0,
    testnet: true,
  },
  [SUI_DEVNET]: {
    id: `sui:${SUI_DEVNET}`,
    name: "SUI Devnet",
    rpc: [],
    slip44: 0,
    testnet: true,
  },
};

export const SuiMetadata: NamespaceMetadata = {
  [SUI_MAINNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
  [SUI_TESTNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
  [SUI_DEVNET]: {
    logo: "/assets/sui.png",
    rgb: "6, 135, 245",
  },
};

export const DEFAULT_SUI_METHODS = {
  SUI_SIGN_TRANSACTION: "sui_signTransaction",
  SUI_SIGN_AND_EXECUTE_TRANSACTION: "sui_signAndExecuteTransaction",
  SUI_SIGN_PERSONAL_MESSAGE: "sui_signPersonalMessage",
} as const;

export const DEFAULT_SUI_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const SuiUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
  }: {
    message: string;
    signature: string;
    address: string;
  }) => {
    const derivedPublicKey = await verifyPersonalMessageSignature(
      new TextEncoder().encode(message),
      signature,
      { address }
    );
    return (
      derivedPublicKey.toSuiAddress().toLowerCase() === address.toLowerCase()
    );
  },
};
