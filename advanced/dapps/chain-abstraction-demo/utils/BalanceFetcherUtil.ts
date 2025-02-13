import { usdcTokenAddresses, usdtTokenAddresses } from "@/consts/tokens";
import { createPublicClient, erc20Abi, Hex, http, PublicClient } from "viem";
import { ChainUtils } from "@/utils/ChainUtils";
import { convertChainIdToHex, formatBalance } from "@/utils/FormatterUtil";

interface TokenConfig {
  symbol: string;
  decimals: number;
  address: Hex;
}

 // Helper function to fetch ERC20 token balance
 async function fetchTokenBalance({
  publicClient,
  userAddress,
  tokenConfig,
  chainId
}: {
  publicClient: PublicClient
  userAddress: Hex
  tokenConfig: TokenConfig
  chainId: number
}): Promise<TokenBalance | null> {
  try {
    const balance = await publicClient.readContract({
      address: tokenConfig.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress]
    })

    return {
      symbol: tokenConfig.symbol,
      balance: formatBalance(balance, tokenConfig.decimals),
      address: tokenConfig.address,
      chainId
    }
  } catch (error) {
    console.error(`Error fetching ${tokenConfig.symbol} balance:`, error)
    return null
  }
}

export const fetchFallbackBalances =
  async (userAddress: Hex, currentChainIdAsHex: Hex): Promise<TokenBalance[]> => {
    const tokenBalances: TokenBalance[] = []
    const currentChainId = parseInt(currentChainIdAsHex.slice(2), 16)

    try {
      // Get all supported chains
      const supportedChainIds = Object.keys(usdcTokenAddresses).map(id => parseInt(id))
      
      // Create public clients for all chains in parallel
      const chainClients = await Promise.all(
        supportedChainIds.map(async chainId => {
          const chain = ChainUtils.getChainConfig(chainId)
          if (!chain) {
            console.error(`Chain not found for ID: ${chainId}`)
            return null
          }
          return {
            chainId,
            client: createPublicClient({
              chain,
              transport: http()
            })
          }
        })
      )

      // Filter out null clients
      const validChainClients = chainClients.filter((client): client is NonNullable<typeof client> => client !== null)

      // Fetch balances for each chain in parallel
      const allChainBalances = await Promise.allSettled(
        validChainClients.map(async ({ chainId, client }) => {
          const chain = ChainUtils.getChainConfig(chainId)
          if (!chain) return []

          const chainBalances: TokenBalance[] = []

          try {
            // Fetch native token balance
            const nativeBalance = await client.getBalance({
              address: userAddress
            })

            chainBalances.push({
              symbol: chain.nativeCurrency.symbol,
              balance: formatBalance(nativeBalance, chain.nativeCurrency.decimals),
              address: '0x' as Hex,
              chainId
            })
          } catch (error) {
            console.error(`Error fetching native balance for chain ${chainId}:`, error)
          }

          // Get supported token configs for this chain
          const supportedTokens: TokenConfig[] = []

          // Add USDC if supported
          const usdcAddress = usdcTokenAddresses[chainId]
          if (usdcAddress) {
            supportedTokens.push({
              symbol: 'USDC',
              decimals: 6,
              address: usdcAddress
            })
          }

          // Add USDT if supported
          const usdtAddress = usdtTokenAddresses[chainId]
          if (usdtAddress) {
            supportedTokens.push({
              symbol: 'USDT',
              decimals: 6,
              address: usdtAddress
            })
          }

          // Fetch token balances
          const tokenResults = await Promise.allSettled(
            supportedTokens.map(token =>
              fetchTokenBalance({
                publicClient: client as PublicClient,
                userAddress,
                tokenConfig: token,
                chainId
              })
            )
          )

          // Add successful token balances
          tokenResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              chainBalances.push(result.value)
            }
          })

          return chainBalances
        })
      )

      // Combine all successful chain balances
      allChainBalances.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          tokenBalances.push(...result.value)
        }
      })

      // create a map of token symblos to list of balances
      const tokenBalancesMap = tokenBalances.reduce((acc, tokenBalance) => {
        if (!acc[tokenBalance.symbol]) {
          acc[tokenBalance.symbol] = []
        }
        acc[tokenBalance.symbol].push(tokenBalance)
        return acc
      }, {} as Record<string, TokenBalance[]>)

      
      const aggregatedBalances = Object.values(tokenBalancesMap).map(tokenBalances => {
        const currentChainBalance = tokenBalances.find(b => b.chainId === currentChainId)?.balance || '0'
        const otherChainsMaxBalance = tokenBalances
          .filter(b => b.chainId !== currentChainId)
          .reduce((maxBalance, b) => Math.max(maxBalance, parseFloat(b.balance)), 0)
        const totalBalance = parseFloat(currentChainBalance) + otherChainsMaxBalance
        return {
          symbol: tokenBalances[0].symbol,
          balance: totalBalance.toFixed(6),
          address: tokenBalances[0].address,
          chainId: currentChainId
        }
      })


      return aggregatedBalances
    } catch (error) {
      console.error('Error in fetchFallbackBalances:', error)
      return tokenBalances
    }
  }
