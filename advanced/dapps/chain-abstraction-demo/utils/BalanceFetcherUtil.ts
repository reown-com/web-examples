import { usdcTokenAddresses, usdtTokenAddresses } from "@/consts/tokens";
import { createPublicClient, erc20Abi, Hex, http, PublicClient } from "viem";
import { ChainUtils } from "@/utils/ChainUtils";
import { convertChainIdToHex, formatBalance } from "@/utils/FormatterUtil";

interface TokenConfig {
  symbol: string;
  decimals: number;
  address: Hex;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  address: `0x${string}`;
  chainId: number;
}

interface ChainClient {
  chainId: number;
  client: PublicClient;
}

// Helper function to fetch ERC20 token balance
async function fetchTokenBalance({
  publicClient,
  userAddress,
  tokenConfig,
  chainId
}: {
  publicClient: PublicClient;
  userAddress: Hex;
  tokenConfig: TokenConfig;
  chainId: number;
}): Promise<TokenBalance | null> {
  try {
    const balance = await publicClient.readContract({
      address: tokenConfig.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    return {
      symbol: tokenConfig.symbol,
      balance: formatBalance(balance, tokenConfig.decimals),
      address: tokenConfig.address,
      chainId
    };
  } catch (error) {
    console.error(`Error fetching ${tokenConfig.symbol} balance:`, error);
    return null;
  }
}

async function createChainClient(chainId: number): Promise<ChainClient | null> {
  const chain = ChainUtils.getChainConfig(chainId);
  if (!chain) {
    console.error(`Chain not found for ID: ${chainId}`);
    return null;
  }
  return {
    chainId,
    client: createPublicClient({
      chain,
      transport: http() 
    }) as PublicClient
  };
}

async function fetchChainBalances(
  chainClient: ChainClient,
  userAddress: Hex
): Promise<TokenBalance[]> {
  const { chainId, client } = chainClient;
  const chain = ChainUtils.getChainConfig(chainId);
  if (!chain) return [];

  const chainBalances: TokenBalance[] = [];

  try {
    // Fetch native token balance
    const nativeBalance = await client.getBalance({
      address: userAddress
    });

    chainBalances.push({
      symbol: chain.nativeCurrency.symbol,
      balance: formatBalance(nativeBalance, chain.nativeCurrency.decimals),
      address: '0x' as Hex,
      chainId
    });
  } catch (error) {
    console.error(`Error fetching native balance for chain ${chainId}:`, error);
  }

  // Get supported token configs for this chain
  const supportedTokens: TokenConfig[] = [];

  // Add USDC if supported
  const usdcAddress = usdcTokenAddresses[chainId];
  if (usdcAddress) {
    supportedTokens.push({
      symbol: 'USDC',
      decimals: 6,
      address: usdcAddress
    });
  }

  // Add USDT if supported
  const usdtAddress = usdtTokenAddresses[chainId];
  if (usdtAddress) {
    supportedTokens.push({
      symbol: 'USDT',
      decimals: 6,
      address: usdtAddress
    });
  }

  // Fetch token balances
  const tokenResults = await Promise.all(
    supportedTokens.map(token =>
      fetchTokenBalance({
        publicClient: client,
        userAddress,
        tokenConfig: token,
        chainId
      })
    )
  );

  // Add successful token balances
  tokenResults.forEach(result => {
    if (result) {
      chainBalances.push(result);
    }
  });

  return chainBalances;
}

export const fetchFallbackBalances = async (
  userAddress: Hex,
  currentChainIdAsHex: Hex
): Promise<TokenBalance[]> => {
  const currentChainId = parseInt(currentChainIdAsHex.slice(2), 16);

  try {
    // Get all supported chains
    const supportedChainIds = Object.keys(usdcTokenAddresses).map(id => parseInt(id));
    
    // Create chain clients
    const chainClientPromises = supportedChainIds.map(chainId => createChainClient(chainId));
    const chainClients = (await Promise.all(chainClientPromises)).filter(
      (client): client is ChainClient => client !== null
    );

    // Fetch balances for each chain
    const allChainBalances = await Promise.all(
      chainClients.map(client => fetchChainBalances(client, userAddress))
    );

    // Flatten all balances
    const tokenBalances = allChainBalances.flat();

    // Separate native tokens from other tokens
    const nativeTokens = tokenBalances.filter(token => token.address === '0x');
    const otherTokens = tokenBalances.filter(token => token.address !== '0x');

    // For native token, only take the current chain's balance
    const currentChainNativeBalance = nativeTokens.find(token => token.chainId === currentChainId);

    // Create a map of other token symbols to list of balances
    const tokenBalancesMap = otherTokens.reduce((acc, tokenBalance) => {
      if (!acc[tokenBalance.symbol]) {
        acc[tokenBalance.symbol] = [];
      }
      acc[tokenBalance.symbol].push(tokenBalance);
      return acc;
    }, {} as Record<string, TokenBalance[]>);

    // Aggregate balances for non-native tokens
    const aggregatedTokenBalances = Object.values(tokenBalancesMap).map(balances => {
      const currentChainBalance = balances.find(b => b.chainId === currentChainId)?.balance || '0';
      const otherChainsMaxBalance = balances
        .filter(b => b.chainId !== currentChainId)
        .reduce((maxBalance, b) => Math.max(maxBalance, parseFloat(b.balance)), 0);
      const totalBalance = parseFloat(currentChainBalance) + otherChainsMaxBalance;

      return {
        symbol: balances[0].symbol,
        balance: totalBalance.toFixed(6),
        address: balances[0].address,
        chainId: currentChainId
      };
    });

    // Combine native token balance with aggregated token balances
    const aggregatedBalances = currentChainNativeBalance 
      ? [currentChainNativeBalance, ...aggregatedTokenBalances]
      : aggregatedTokenBalances;

    return aggregatedBalances;
  } catch (error) {
    console.error('Error in fetchFallbackBalances:', error);
    return [];
  }
};