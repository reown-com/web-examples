if (!process.env.NEXT_PUBLIC_PROJECT_ID)
  throw new Error("`NEXT_PUBLIC_PROJECT_ID` env variable is missing.");

export const DEFAULT_MAIN_CHAINS = [
  // mainnets
  "eip155:1",
  "eip155:10",
  "eip155:100",
  "eip155:137",
  "eip155:42161",
  "eip155:42220",
  "cosmos:cosmoshub-4",
  "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
  "polkadot:91b171bb158e2d3848fa23a9f1c25182",
  "elrond:1",
  "tron:0x2b6653dc",
];

export const DEFAULT_TEST_CHAINS = [
  // testnets
  "eip155:5",
  "eip155:420",
  "eip155:80001",
  "eip155:421611",
  "eip155:44787",
  "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
  "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
  "near:testnet",
  "elrond:D",
  "tron:0xcd8690dc",
];

export const DEFAULT_CHAINS = [...DEFAULT_MAIN_CHAINS, ...DEFAULT_TEST_CHAINS];

export const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
export const DEFAULT_RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL;

export const DEFAULT_LOGGER = "debug";

export const DEFAULT_APP_METADATA = {
  name: "React App",
  description: "React App for WalletConnect",
  url: "https://walletconnect.com/",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

/**
 * EIP155
 */
export enum DEFAULT_EIP155_METHODS {
  ETH_SEND_TRANSACTION = "eth_sendTransaction",
  ETH_SIGN_TRANSACTION = "eth_signTransaction",
  ETH_SIGN = "eth_sign",
  PERSONAL_SIGN = "personal_sign",
  ETH_SIGN_TYPED_DATA = "eth_signTypedData",
}

export enum DEFAULT_EIP_155_EVENTS {
  ETH_CHAIN_CHANGED = "chainChanged",
  ETH_ACCOUNTS_CHANGED = "accountsChanged",
}

/**
 * COSMOS
 */
export enum DEFAULT_COSMOS_METHODS {
  COSMOS_SIGN_DIRECT = "cosmos_signDirect",
  COSMOS_SIGN_AMINO = "cosmos_signAmino",
}

export enum DEFAULT_COSMOS_EVENTS {}

/**
 * SOLANA
 */
export enum DEFAULT_SOLANA_METHODS {
  SOL_SIGN_TRANSACTION = "solana_signTransaction",
  SOL_SIGN_MESSAGE = "solana_signMessage",
}

export enum DEFAULT_SOLANA_EVENTS {}

/**
 * POLKADOT
 */
export enum DEFAULT_POLKADOT_METHODS {
  POLKADOT_SIGN_TRANSACTION = "polkadot_signTransaction",
  POLKADOT_SIGN_MESSAGE = "polkadot_signMessage",
}

export enum DEFAULT_POLKADOT_EVENTS {}

/**
 * NEAR
 */
export enum DEFAULT_NEAR_METHODS {
  NEAR_SIGN_IN = "near_signIn",
  NEAR_SIGN_OUT = "near_signOut",
  NEAR_GET_ACCOUNTS = "near_getAccounts",
  NEAR_SIGN_AND_SEND_TRANSACTION = "near_signAndSendTransaction",
  NEAR_SIGN_AND_SEND_TRANSACTIONS = "near_signAndSendTransactions",
}

export enum DEFAULT_NEAR_EVENTS {}

/**
 * ELROND
 */
export enum DEFAULT_ELROND_METHODS {
  ELROND_SIGN_TRANSACTION = "erd_signTransaction",
  ELROND_SIGN_TRANSACTIONS = "erd_signTransactions",
  ELROND_SIGN_MESSAGE = "erd_signMessage",
  ELROND_SIGN_LOGIN_TOKEN = "erd_signLoginToken",
}

export enum DEFAULT_ELROND_EVENTS {}

/**
 * TRON
 */
export enum DEFAULT_TRON_METHODS {
  TRON_SIGN_TRANSACTION = "tron_signTransaction",
  TRON_SIGN_MESSAGE = "tron_signMessage",
}

export enum DEFAULT_TRON_EVENTS {}

export const DEFAULT_GITHUB_REPO_URL =
  "https://github.com/WalletConnect/web-examples/tree/main/dapps/react-dapp-v2";

type RelayerType = {
  value: string | undefined;
  label: string;
};

export const REGIONALIZED_RELAYER_ENDPOINTS: RelayerType[] = [
  {
    value: DEFAULT_RELAY_URL,
    label: "Default",
  },

  {
    value: "wss://us-east-1.relay.walletconnect.com/",
    label: "US",
  },
  {
    value: "wss://eu-central-1.relay.walletconnect.com/",
    label: "EU",
  },
  {
    value: "wss://ap-southeast-1.relay.walletconnect.com/",
    label: "Asia Pacific",
  },
];
