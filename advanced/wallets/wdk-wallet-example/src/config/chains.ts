/**
 * Central configuration for the wallet: project id, metadata, supported chains
 * and the WalletConnect signing methods we advertise per namespace.
 *
 * Keep this list small and explicit — it is a demo wallet.
 */

export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
export const RELAY_URL =
  process.env.NEXT_PUBLIC_RELAY_URL || "wss://relay.walletconnect.com";

export const WALLET_METADATA = {
  name: "WDK Wallet Example",
  description:
    "A minimal WalletConnect wallet powered by Tether WDK for key handling",
  url: "https://reown.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

/**
 * Reown Blockchain API JSON-RPC endpoint. Works for any supported EVM chain and
 * keeps us from hard-coding a public RPC per network.
 */
export const evmRpc = (chainId: number) =>
  `https://rpc.walletconnect.org/v1?chainId=eip155:${chainId}&projectId=${PROJECT_ID}`;

export interface EvmChain {
  namespace: "eip155";
  chainId: number;
  caip2: string;
  name: string;
  symbol: string;
  rpc: string;
}

export const EVM_CHAINS: Record<string, EvmChain> = {
  "eip155:1": {
    namespace: "eip155",
    chainId: 1,
    caip2: "eip155:1",
    name: "Ethereum",
    symbol: "ETH",
    rpc: evmRpc(1),
  },
  "eip155:11155111": {
    namespace: "eip155",
    chainId: 11155111,
    caip2: "eip155:11155111",
    name: "Ethereum Sepolia",
    symbol: "ETH",
    rpc: evmRpc(11155111),
  },
  "eip155:137": {
    namespace: "eip155",
    chainId: 137,
    caip2: "eip155:137",
    name: "Polygon",
    symbol: "POL",
    rpc: evmRpc(137),
  },
  "eip155:8453": {
    namespace: "eip155",
    chainId: 8453,
    caip2: "eip155:8453",
    name: "Base",
    symbol: "ETH",
    rpc: evmRpc(8453),
  },
  "eip155:42161": {
    namespace: "eip155",
    chainId: 42161,
    caip2: "eip155:42161",
    name: "Arbitrum",
    symbol: "ETH",
    rpc: evmRpc(42161),
  },
};

export interface SolanaChain {
  namespace: "solana";
  caip2: string;
  name: string;
  symbol: string;
  rpc: string;
}

export const SOLANA_CHAINS: Record<string, SolanaChain> = {
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    namespace: "solana",
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    name: "Solana",
    symbol: "SOL",
    rpc: "https://api.mainnet-beta.solana.com",
  },
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
    namespace: "solana",
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    name: "Solana Devnet",
    symbol: "SOL",
    rpc: "https://api.devnet.solana.com",
  },
};

export interface TonChain {
  namespace: "ton";
  caip2: string;
  name: string;
  symbol: string;
  rpc: string;
}

export const TON_CHAINS: Record<string, TonChain> = {
  "ton:-239": {
    namespace: "ton",
    caip2: "ton:-239",
    name: "TON",
    symbol: "TON",
    rpc: "https://toncenter.com/api/v2/jsonRPC",
  },
  "ton:-3": {
    namespace: "ton",
    caip2: "ton:-3",
    name: "TON Testnet",
    symbol: "TON",
    rpc: "https://ton-testnet.api.onfinality.io/public",
  },
};

/** Default RPC endpoints used when deriving accounts / signing messages. */
export const DEFAULT_SOLANA_RPC =
  SOLANA_CHAINS["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"].rpc;
export const DEFAULT_TON_RPC = TON_CHAINS["ton:-239"].rpc;

/**
 * Signing methods advertised per namespace.
 *
 * All of these are handled: EVM via WDK's account API directly, Solana & TON by
 * bridging WalletConnect's serialized payloads onto WDK's raw key pair (see
 * src/lib/solanaSigner.ts and src/lib/tonSigner.ts).
 */
export const EVM_SIGNING_METHODS = {
  PERSONAL_SIGN: "personal_sign",
  ETH_SEND_TRANSACTION: "eth_sendTransaction",
  ETH_SIGN_TRANSACTION: "eth_signTransaction",
  ETH_SIGN_TYPED_DATA_V4: "eth_signTypedData_v4",
} as const;

export const SOLANA_SIGNING_METHODS = {
  SOLANA_SIGN_MESSAGE: "solana_signMessage",
  SOLANA_SIGN_TRANSACTION: "solana_signTransaction",
  SOLANA_SIGN_AND_SEND_TRANSACTION: "solana_signAndSendTransaction",
  SOLANA_SIGN_ALL_TRANSACTIONS: "solana_signAllTransactions",
} as const;

export const TON_SIGNING_METHODS = {
  TON_SEND_MESSAGE: "ton_sendMessage",
  TON_SIGN_DATA: "ton_signData",
} as const;

export const ALL_CHAINS = { ...EVM_CHAINS, ...SOLANA_CHAINS, ...TON_CHAINS };

export type Namespace = "eip155" | "solana" | "ton";

export function getChainMeta(caip2: string) {
  return ALL_CHAINS[caip2 as keyof typeof ALL_CHAINS];
}
