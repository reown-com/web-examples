import { getChainById } from "@/utils/ChainUtil";
import { createPublicClient, erc20Abi, getContract, http, isAddress, toHex } from "viem";

// Types and Interfaces
type Hex = `0x${string}`;
type ChainId = number;

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

interface TokenBalance {
  balance: bigint;
  decimals: number;
}

interface Asset {
  address: Hex | "native";
  balance: Hex;
  type: string;
  metadata: TokenMetadata;
}

interface AggregatedBalance {
  totalBalance: bigint;
  tokenDecimals: number;
}

interface TokenConfig {
  chainAddresses: Record<ChainId, Hex>;
  metadata: TokenMetadata;
}

export interface WalletGetAssetsRequest {
  account: Hex;
  assetFilter?: Record<Hex, (string | "native")[]>;
  assetTypeFilter?: string[];
  chainFilter?: Hex[];
}

export type WalletGetAssetsResponse = Record<Hex, Asset[]>;

// Constants
export const EIP7811_METHODS = 'wallet_getAssets';

// Chain configurations
const SUPPORTED_CHAINS = {
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
} as const;

// Token configurations including supported chains and metadata
const AGGREGATED_TOKEN_CONFIG: Record<string, TokenConfig> = {
  USDC: {
    chainAddresses: {
      [SUPPORTED_CHAINS.ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      [SUPPORTED_CHAINS.OPTIMISM]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      [SUPPORTED_CHAINS.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
    metadata: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6
    }
  },
  USDT: {
    chainAddresses: {
      [SUPPORTED_CHAINS.ARBITRUM]: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      [SUPPORTED_CHAINS.OPTIMISM]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"
    },
    metadata: {
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6
    }
  }
};

// Native token configuration
const NATIVE_TOKEN_CONFIG: Record<ChainId, TokenMetadata> = {
  [SUPPORTED_CHAINS.ARBITRUM]: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  [SUPPORTED_CHAINS.OPTIMISM]: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  [SUPPORTED_CHAINS.BASE]: { name: "Ethereum", symbol: "ETH", decimals: 18 }
};

const CHAINS_FOR_NATIVE_AGGREGATION = [
  SUPPORTED_CHAINS.ARBITRUM,
  SUPPORTED_CHAINS.OPTIMISM,
  SUPPORTED_CHAINS.BASE
];

async function fetchNativeBalance(
  chainId: ChainId,
  accountAddress: Hex
): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http()
  });
  
  return await publicClient.getBalance({ address: accountAddress });
}

async function fetchERC20Balance(
  chainId: ChainId, 
  tokenAddress: Hex, 
  accountAddress: Hex
): Promise<TokenBalance> {
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http()
  });
  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient
  });
  
  const [balance, decimals] = await Promise.all([
    contract.read.balanceOf([accountAddress]),
    contract.read.decimals()
  ]);
  
  return { balance, decimals };
}

async function aggregateNativeBalances(
  chainIds: ChainId[],
  accountAddress: Hex
): Promise<AggregatedBalance> {
  const balancePromises = chainIds.map(chainId => fetchNativeBalance(chainId, accountAddress));
  const balances = await Promise.all(balancePromises);
  
  return {
    totalBalance: balances.reduce((sum, balance) => sum + balance, BigInt(0)),
    tokenDecimals: NATIVE_TOKEN_CONFIG[chainIds[0]].decimals
  };
}

async function aggregateERC20Balances(
  tokenConfig: TokenConfig,
  accountAddress: Hex
): Promise<AggregatedBalance> {
  const supportedChainIds = Object.keys(tokenConfig.chainAddresses).map(Number);
  const balancePromises = supportedChainIds.map(chainId => 
    fetchERC20Balance(chainId, tokenConfig.chainAddresses[chainId], accountAddress)
  );

  const balances = await Promise.all(balancePromises);
  
  return {
    totalBalance: balances.reduce((sum, { balance }) => sum + balance, BigInt(0)),
    tokenDecimals: tokenConfig.metadata.decimals
  };
}

function createAssetResponse(
  address: Hex | "native",
  balance: bigint,
  metadata: TokenMetadata
): Asset {
  return {
    address,
    balance: toHex(balance),
    type: address === "native" ? "NATIVE" : "ERC20",
    metadata
  };
}

async function processAggregatedToken(
  tokenSymbol: string,
  tokenAddress: Hex,
  accountAddress: Hex
): Promise<Asset> {
  const tokenConfig = AGGREGATED_TOKEN_CONFIG[tokenSymbol];
  const { totalBalance } = await aggregateERC20Balances(tokenConfig, accountAddress);

  return createAssetResponse(
    tokenAddress,
    totalBalance,
    tokenConfig.metadata
  );
}

async function processUnknownToken(
  chainId: ChainId,
  tokenAddress: Hex,
  accountAddress: Hex
): Promise<Asset> {
  const { balance, decimals } = await fetchERC20Balance(chainId, tokenAddress, accountAddress);
  return createAssetResponse(
    tokenAddress,
    balance,
    {
      name: 'Unknown Token',
      symbol: 'UNK',
      decimals
    }
  );
}

async function processNativeToken(
  chainId: ChainId,
  accountAddress: Hex,
  shouldAggregate: boolean
): Promise<Asset> {
  if (shouldAggregate) {
    const { totalBalance } = await aggregateNativeBalances(CHAINS_FOR_NATIVE_AGGREGATION, accountAddress);
    return createAssetResponse(
      "native",
      totalBalance,
      NATIVE_TOKEN_CONFIG[chainId]
    );
  }

  const balance = await fetchNativeBalance(chainId, accountAddress);
  return createAssetResponse(
    "native",
    balance,
    NATIVE_TOKEN_CONFIG[chainId]
  );
}

async function processChainAssets(
  chainId: ChainId,
  chainIdHex: Hex,
  requestedAssets: (string | "native")[],
  accountAddress: Hex
): Promise<Asset[]> {
  const assetPromises = requestedAssets.map(async (assetAddress) => {
    try {
      // Handle native token
      if (assetAddress === "native") {
        const shouldAggregateNative = CHAINS_FOR_NATIVE_AGGREGATION.includes(chainId as typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]);
        return processNativeToken(chainId, accountAddress, shouldAggregateNative);
      }

      if (!isAddress(assetAddress)) {
        return null;
      }

      // Find if it's a supported aggregated token
      const tokenSymbol = Object.entries(AGGREGATED_TOKEN_CONFIG)
        .find(([_, config]) => config.chainAddresses[chainId] === assetAddress)?.[0];

      if (tokenSymbol) {
        return processAggregatedToken(tokenSymbol, assetAddress as Hex, accountAddress);
      }

      // Handle unknown ERC20 token
      return processUnknownToken(chainId, assetAddress as Hex, accountAddress);
    } catch (error) {
      console.error(`Error processing asset ${assetAddress} on chain ${chainId}:`, error);
      return null;
    }
  });

  const assets = await Promise.all(assetPromises);
  return assets.filter((asset): asset is Asset => asset !== null);
}

export async function handleGetAssets(
  projectId: string,
  params: WalletGetAssetsRequest[]
): Promise<WalletGetAssetsResponse> {
  const [data] = params;
  const response: WalletGetAssetsResponse = {};

  if (!data.assetFilter) {
    return response;
  }

  const chainProcessingPromises = Object.entries(data.assetFilter)
    .map(async ([chainIdHex, requestedAssets]) => {
      const chainId = parseInt(chainIdHex.slice(2), 16);
      const assets = await processChainAssets(
        chainId,
        chainIdHex as Hex,
        requestedAssets,
        data.account
      );

      return { chainIdHex, assets };
    });

  const results = await Promise.all(chainProcessingPromises);
  
  results.forEach(({ chainIdHex, assets }) => {
    response[chainIdHex as Hex] = assets;
  });

  return response;
}