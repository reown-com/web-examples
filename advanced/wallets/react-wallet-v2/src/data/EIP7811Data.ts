import { getChainById } from "@/utils/ChainUtil";
import { createPublicClient, erc20Abi, getContract, http, isAddress, toHex } from "viem";

// Types and Interfaces
type Hex = `0x${string}`;

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

export interface WalletGetAssetsRequest {
  account: Hex;
  assetFilter?: Record<Hex, string[]>;
  assetTypeFilter?: string[];
  chainFilter?: Hex[];
}

export type WalletGetAssetsResponse = Record<Hex, Asset[]>;

// Constants
export const EIP7811_METHODS = 'wallet_getAssets';

export const usdcTokenAddresses: Record<number, Hex> = {
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
};

export const usdtTokenAddresses: Record<number, Hex> = {
  42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Arbitrum
  10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // Optimism
};

export const supportedCATokens: Record<string, Record<number, Hex>> = {
  USDC: usdcTokenAddresses,
  USDT: usdtTokenAddresses
};

async function fetchTokenBalance(
  chainId: number, 
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
  })
  
  // Fetch balance and decimals in parallel
  const [balance, decimals] = await Promise.all([
    contract.read.balanceOf([accountAddress]),
    contract.read.decimals()
  ]);
  
  return { balance, decimals };
}

async function aggregateBalances(
  chainIds: number[], 
  accountAddress: Hex,
  tokenAddresses: Record<number, Hex>
): Promise<AggregatedBalance> {
  // Create array of promises for parallel execution
  const balancePromises = chainIds
    .filter(chainId => tokenAddresses[chainId]) // Filter out unsupported chains
    .map(chainId => fetchTokenBalance(chainId, tokenAddresses[chainId], accountAddress));

  const results = await Promise.all(balancePromises);
  
  // Reduce results to get total balance
  return results.reduce((acc, curr) => ({
    totalBalance: acc.totalBalance + curr.balance,
    tokenDecimals: curr.decimals // All instances should have same decimals
  }), { totalBalance: BigInt(0), tokenDecimals: 0 });
}

function createAssetResponse(
  address: Hex,
  balance: bigint,
  metadata: TokenMetadata
): Asset {
  return {
    address,
    balance: toHex(balance),
    type: 'ERC20',
    metadata
  };
}

async function processCAToken(
  tokenKey: string,
  asset: Hex,
  accountAddress: Hex
): Promise<Asset> {
  const supportedChains = Object.keys(supportedCATokens[tokenKey]).map(Number);
  const { totalBalance, tokenDecimals } = await aggregateBalances(
    supportedChains,
    accountAddress,
    supportedCATokens[tokenKey]
  );

  return createAssetResponse(
    asset,
    totalBalance,
    {
      name: tokenKey,
      symbol: tokenKey,
      decimals: tokenDecimals
    }
  );
}

async function processChainAssets(
  chainId: number,
  chainIdHex: Hex,
  requestedAssets: string[],
  accountAddress: Hex,
  supportedTokensOnChain: Hex[]
): Promise<Asset[]> {
  const assetPromises = requestedAssets
    .filter((address: string): address is Hex => isAddress(address))
    .map(async (asset) => {
      try {
        if (!supportedTokensOnChain.includes(asset as Hex)) {
          // Process unknown token
          const { balance, decimals } = await fetchTokenBalance(chainId, asset as Hex, accountAddress);
          return createAssetResponse(
            asset as Hex,
            balance,
            {
              name: 'Unknown Token',
              symbol: 'UNK',
              decimals
            }
          );
        }

        // Process supported CA token
        const tokenKey = Object.keys(supportedCATokens)
          .find(key => supportedCATokens[key][chainId] === asset);

        if (tokenKey) {
          return processCAToken(tokenKey, asset as Hex, accountAddress);
        }
        
        return null;
      } catch (error) {
        console.error(`Error processing asset ${asset} on chain ${chainId}:`, error);
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

  // Process all chains in parallel
  const chainProcessingPromises = Object.entries(data.assetFilter)
    .map(async ([chainIdHex, requestedAssets]) => {
      const chainId = parseInt(chainIdHex.slice(2), 16);
      const supportedTokensOnChain = Object.values(supportedCATokens)
        .map(tokens => tokens[chainId])
        .filter((address): address is Hex => !!address);

      const assets = await processChainAssets(
        chainId,
        chainIdHex as Hex,
        requestedAssets,
        data.account,
        supportedTokensOnChain
      );

      return { chainIdHex, assets };
    });

  // Wait for all chain processing to complete
  const results = await Promise.all(chainProcessingPromises);

  // Build final response
  results.forEach(({ chainIdHex, assets }) => {
    response[chainIdHex as Hex] = assets;
  });

  return response;
}