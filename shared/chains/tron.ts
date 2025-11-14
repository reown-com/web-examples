import { getTronWeb } from "../helpers";
import { NamespaceMetadata, ChainsMap } from "../types";

export const TronChainData: ChainsMap = {
  "0x2b6653dc": {
    id: "tron:0x2b6653dc",
    name: "Tron Mainnet",
    rpc: [],
    slip44: 195,
    testnet: false,
  },
  "0xcd8690dc": {
    id: "tron:0xcd8690dc",
    name: "Tron Testnet",
    rpc: [],
    slip44: 195,
    testnet: true,
  },
};

export const TronMetadata: NamespaceMetadata = {
  // Tron Mainnet
  "0x2b6653dc": {
    logo: "/assets/tron.png",
    rgb: "183, 62, 49",
  },
  // Tron TestNet
  "0xcd8690dc": {
    logo: "assets/tron.png",
    rgb: "183, 62, 49",
  },
};

export const DEFAULT_TRON_METHODS = {
  TRON_SIGN_TRANSACTION: "tron_signTransaction",
  TRON_SIGN_MESSAGE: "tron_signMessage",
} as const;

export const DEFAULT_TRON_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const TronUtils = {
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
    const tronWeb = getTronWeb(chainId);
    if (!tronWeb) {
      throw new Error("Tron web not found for chainId: " + chainId);
    }
    const valid = await tronWeb.trx.verifyMessageV2(message, signature);
    return valid === address;
  },
};
