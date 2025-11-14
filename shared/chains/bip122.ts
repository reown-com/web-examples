import { schnorr } from "@noble/secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import BitcoinMessage from "bitcoinjs-message";
import { NamespaceMetadata, ChainsMap } from "../types";
import { convertHexToBase64 } from "../helpers";

export const BtcChainData: ChainsMap = {
  "000000000019d6689c085ae165831e93": {
    id: "bip122:000000000019d6689c085ae165831e93",
    name: "Bitcoin",
    rpc: [],
    slip44: 0,
    testnet: false,
  },
  "000000000933ea01ad0ee984209779ba": {
    id: "bip122:000000000933ea01ad0ee984209779ba",
    name: "Bitcoin Testnet",
    rpc: [],
    slip44: 1,
    testnet: true,
  },
};

export const BtcMetadata: NamespaceMetadata = {
  "000000000019d6689c085ae165831e93": {
    logo: "/assets/btc-testnet.png",
    rgb: "247, 147, 26",
  },
  "000000000933ea01ad0ee984209779ba": {
    logo: "/assets/btc-testnet.png",
    rgb: "247, 147, 26",
  },
};

// Wallet-specific data structures
export const BIP122_NAMESPACE = "bip122";

export const BIP122_MAINNET = "000000000019d6689c085ae165831e93";
export const BIP122_TESTNET = "000000000933ea01ad0ee984209779ba";
export const BIP122_DUST_LIMIT = "1001";

export const BIP122_MAINNET_ID = "000000000019d6689c085ae165831e93";
export const BIP122_TESTNET_ID = "000000000933ea01ad0ee984209779ba";
export const BIP122_MAINNET_CAIP2 = `${BIP122_NAMESPACE}:${BIP122_MAINNET_ID}`;
export const BIP122_TESTNET_CAIP2 = `${BIP122_NAMESPACE}:${BIP122_TESTNET_ID}`;

export type IBip122ChainId =
  | typeof BIP122_MAINNET_CAIP2
  | typeof BIP122_TESTNET_CAIP2;

export const BITCOIN_MAINNET = {
  [BIP122_MAINNET_CAIP2]: {
    chainId: BIP122_MAINNET_ID,
    name: "BTC Mainnet",
    logo: "/chain-logos/btc-testnet.png",
    rgb: "107, 111, 147",
    rpc: "",
    coinType: "0",
    caip2: BIP122_MAINNET_CAIP2 as IBip122ChainId,
    namespace: BIP122_NAMESPACE,
  },
};

export const BITCOIN_TESTNET = {
  [BIP122_TESTNET_CAIP2]: {
    chainId: BIP122_TESTNET_ID,
    name: "BTC Testnet",
    logo: "/chain-logos/btc-testnet.png",
    rgb: "247, 147, 25",
    rpc: "",
    coinType: "1",
    caip2: BIP122_TESTNET_CAIP2 as IBip122ChainId,
    namespace: BIP122_NAMESPACE,
  },
};

export const BIP122_CHAINS = {
  ...BITCOIN_MAINNET,
  ...BITCOIN_TESTNET,
} as Record<
  IBip122ChainId,
  (typeof BITCOIN_MAINNET)[typeof BIP122_MAINNET_CAIP2] &
    (typeof BITCOIN_TESTNET)[typeof BIP122_TESTNET_CAIP2]
>;

export const DEFAULT_BIP122_METHODS = {
  BIP122_SEND_TRANSACTION: "sendTransfer",
  BIP122_GET_ACCOUNT_ADDRESSES: "getAccountAddresses",
  BIP122_SIGN_MESSAGE: "signMessage",
  BIP122_SIGN_PSBT: "signPsbt",
} as const;

export const DEFAULT_BIP122_EVENTS = {
  ACCOUNTS_CHANGED: "accountsChanged",
  CHAIN_CHANGED: "chainChanged",
} as const;

export const BtcUtils = {
  verifyMessage: async ({
    message,
    signature,
    address,
  }: {
    message: string;
    signature: string;
    address: string;
  }) => {
    // if taproot address
    if (address.startsWith("bc1p") || address.startsWith("tb1p")) {
      // Convert the Ordinals address (Taproot) to the internal public key
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version !== 1 || decoded.data.length !== 32) {
        throw new Error("Invalid Taproot address");
      }

      const publicKey = decoded.data; // The 32-byte internal public key (X coordinate of pubkey)

      // Hash the message using SHA256 (standard Bitcoin message hashing)
      const messageHash = bitcoin.crypto.sha256(Buffer.from(message));

      // Verify the Schnorr signature using tiny-secp256k1
      return schnorr.verify(
        new Uint8Array(Buffer.from(signature, "hex")),
        new Uint8Array(messageHash),
        new Uint8Array(publicKey)
      );
    }

    return BitcoinMessage.verify(
      message,
      address,
      convertHexToBase64(signature),
      undefined,
      true
    );
  },
};
