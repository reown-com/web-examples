import { supportedTokens } from "@/data/EIP155Data";
import { tokenAddresses } from "@/consts/tokens";
import { createPublicClient, erc20Abi, Hex, http, PublicClient } from "viem";
import { formatBalance } from "@/utils/FormatterUtil";
import { getChain } from "@/utils/NetworksUtil";

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

// Helper function to fetch ERC20 token balance
async function fetchTokenBalance({
  publicClient,
  userAddress,
  tokenConfig,
  chainId,
}: {
  publicClient: PublicClient;
  userAddress: Hex;
  tokenConfig: {
    symbol: string;
    decimals: number;
    address: Hex;
  };
  chainId: number;
}): Promise<TokenBalance | null> {
  try {
    const balance = await publicClient.readContract({
      address: tokenConfig.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress],
    });

    return {
      symbol: tokenConfig.symbol,
      balance: formatBalance(balance, tokenConfig.decimals),
      address: tokenConfig.address,
      chainId,
    };
  } catch (error) {
    console.error(`Error fetching ${tokenConfig.symbol} balance:`, error);
    return null;
  }
}

function getTransport({ chainId }: { chainId: number }) {
  return http(
    `https://rpc.walletconnect.org/v1/?chainId=eip155:${chainId}&projectId=${process.env["NEXT_PUBLIC_PROJECT_ID"]}`,
  );
}

export async function fetchFallbackBalances(
  userAddress: Hex,
  currentChainIdAsHex: Hex,
): Promise<TokenBalance[]> {
  const currentChainId = parseInt(currentChainIdAsHex.slice(2), 16);

  try {
    const chain = getChain(currentChainId);
    if (!chain) {
      console.error(`Chain not found for ID: ${currentChainId}`);
      return [];
    }

    // Create public client for current chain
    const publicClient = createPublicClient({
      chain,
      transport: getTransport({ chainId: chain.id }),
    }) as PublicClient;

    const balances: TokenBalance[] = [];
    const tokenBalancePromises: Promise<TokenBalance | null>[] = [];

    // Filter tokens supported on the current chain
    const tokensForChain = supportedTokens.filter(token => 
      token.supportedChainIds.includes(currentChainId)
    );

    const nativeTokens = tokensForChain.filter(token => token.type === "native");
    for (const nativeToken of nativeTokens) {
      try {
        const nativeBalance = await publicClient.getBalance({
          address: userAddress,
        });

        balances.push({
          symbol: nativeToken.name,
          balance: formatBalance(nativeBalance, nativeToken.decimals),
          address: "0x" as Hex,
          chainId: currentChainId,
        });
      } catch (error) {
        console.error(`Error fetching native ${nativeToken.name} balance:`, error);
      }
    }

    const erc20Tokens = tokensForChain.filter(token => token.type === "erc20");
    for (const erc20Token of erc20Tokens) {
      const tokenAddressMap = tokenAddresses[erc20Token.id];
      if (!tokenAddressMap) continue;

      const tokenAddress = tokenAddressMap[currentChainId];
      if (!tokenAddress) continue;

      tokenBalancePromises.push(
        fetchTokenBalance({
          publicClient,
          userAddress,
          tokenConfig: {
            symbol: erc20Token.name,
            decimals: erc20Token.decimals,
            address: tokenAddress,
          },
          chainId: currentChainId,
        })
      );
    }

    const tokenResults = await Promise.all(tokenBalancePromises);
    
    tokenResults.forEach(result => {
      if (result) {
        balances.push(result);
      }
    });

    return balances;
  } catch (error) {
    console.error("Error in fetchFallbackBalances:", error);
    return [];
  }
}
