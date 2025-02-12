import * as React from "react";
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from "@reown/appkit/react";
import { base, optimism } from "viem/chains";
import UniversalProvider from "@walletconnect/universal-provider";
import { usdcTokenAddresses, usdtTokenAddresses } from "@/consts/tokens";
import { RpcRequest } from "ox";
import { projectId } from "@/config";
import { createPublicClient, erc20Abi, Hex, http, PublicClient } from "viem";
import { ChainUtils } from "@/utils/ChainUtils";
import { Asset, WalletGetAssetsRPCRequest, WalletGetAssetsRPCResponse } from "@/types/ERC7811";
import { Capabilities } from "@/types/ERC5792";
export interface TokenBalance {
  symbol: string;
  balance: string;
  address: Hex;
}

interface TokenConfig {
  symbol: string;
  decimals: number;
  address: Hex;
}
interface WalletAssetsContextType {
  balances: TokenBalance[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  getBalanceBySymbol: (symbol: string) => string;
  getBalanceByAddress: (address: Hex) => string;
}
const WalletAssetsContext = React.createContext<
  WalletAssetsContextType | undefined
>(undefined);

export const WalletAssetsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { walletProvider, walletProviderType } =
    useAppKitProvider<UniversalProvider>("eip155");
  const [balances, setBalances] = React.useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const formatBalance = (balance: bigint, decimals: number): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    if (value >= 0.01) return value.toFixed(2);
    const significantDecimals = Math.min(6, decimals);
    return value.toFixed(significantDecimals).replace(/\.?0+$/, "");
  };

  const convertChainIdToHex = (chainId: number): Hex => {
    return `0x${parseInt(chainId.toString()).toString(16)}` as Hex;
  };

  const processAssetsToBalances = React.useCallback((chainAssets: Asset[]): TokenBalance[] => {
    return chainAssets.map((asset) => ({
      symbol: asset.metadata.symbol,
      balance: formatBalance(BigInt(asset.balance), asset.metadata.decimals),
      address: asset.address as Hex,
    }));
  },[]);

  const getAssetDiscoveryCapabilities = React.useCallback(async (
    provider: UniversalProvider,
    chainIdAsHex: Hex,
    userAddress: string
  ): Promise<{
    hasAssetDiscovery: boolean;
    hasWalletService: boolean;
    walletServiceUrl?: string;
  }> => {
    try {
      
      const capabilities = await provider.request({
        method: "wallet_getCapabilities",
        params: [userAddress]
      }) as Capabilities;

      const hasAssetDiscovery = capabilities[chainIdAsHex]?.assetDiscovery?.supported ?? false;
      if(!hasAssetDiscovery) {
        return {
          hasAssetDiscovery: false,
          hasWalletService: false
        };
      }
      // For WalletConnect, also check CAIP-25
      let walletServiceUrl;
      if (walletProviderType === "WALLET_CONNECT") {
        const sessionCapabilities = JSON.parse(
          provider.session?.sessionProperties?.["capabilities"] || "{}"
        );
        walletServiceUrl = sessionCapabilities[chainIdAsHex]?.["walletService"]?.["wallet_getAssets"];
      }

      return {
        hasAssetDiscovery,
        hasWalletService: !!walletServiceUrl,
        walletServiceUrl
      };
    } catch (error) {
      console.error("Error checking wallet capabilities:", error);
      return {
        hasAssetDiscovery: false,
        hasWalletService: false
      };
    }
  },[walletProviderType]);

  const getAssetsViaWalletService = React.useCallback(async (
    request: WalletGetAssetsRPCRequest,
    walletServiceUrl: string
  ): Promise<Record<Hex, Asset[]>[]> => {
    const store = RpcRequest.createStore();
    const rpcRequest = store.prepare({
      method: "wallet_getAssets",
      params: [request],
    });

    const url = new URL(walletServiceUrl);
    url.searchParams.set("projectId", projectId!);

    const response = await fetch(url.toString(), {
      body: JSON.stringify(rpcRequest),
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const { result } = await response.json() as WalletGetAssetsRPCResponse;
    return result;
  },[]);

  const getAssetsViaProvider =React.useCallback(async (
    provider: UniversalProvider,
    request: WalletGetAssetsRPCRequest
  ): Promise<Record<Hex, Asset[]>[]> => {
    const response = await provider.request({
      method: "wallet_getAssets",
      params: [request],
    }) as Record<Hex, Asset[]>;

    return [response];
  },[]);

  // Helper function to fetch ERC20 token balance
  const fetchTokenBalance = async (
    publicClient: PublicClient,
    userAddress: Hex,
    tokenConfig: TokenConfig,
    formatBalance: (value: bigint, decimals: number) => string
  ): Promise<TokenBalance | null> => {
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
        address: tokenConfig.address
      };
    } catch (error) {
      console.error(`Error fetching ${tokenConfig.symbol} balance:`, error);
      return null;
    }
  };

  const fetchFallbackBalances = React.useCallback(async (
    userAddress: Hex,
    chainIdAsHex: Hex,
  ): Promise<TokenBalance[]> => {
    const chainIdNum = parseInt(chainIdAsHex.slice(2), 16);
    const tokenBalances: TokenBalance[] = [];
    
    try {
      const chain = ChainUtils.getChainConfig(chainIdNum);
      const publicClient = createPublicClient({
        chain,
        transport: http()
      });
  
      // Fetch native token balance
      try {
        const nativeBalance = await publicClient.getBalance({
          address: userAddress,
        });
  
        tokenBalances.push({
          symbol: chain.nativeCurrency.symbol,
          balance: formatBalance(nativeBalance, chain.nativeCurrency.decimals),
          address: '0x' as Hex
        });
      } catch (error) {
        console.error('Error fetching native balance:', error);
      }
  
      // Configure supported tokens for the chain
      const supportedTokens: TokenConfig[] = [];
      
      // Add USDC if supported on this chain
      const usdcAddress = usdcTokenAddresses[chainIdNum];
      if (usdcAddress) {
        supportedTokens.push({
          symbol: 'USDC',
          decimals: 6,
          address: usdcAddress
        });
      }
  
      // Add USDT if supported on this chain
      const usdtAddress = usdtTokenAddresses[chainIdNum];
      if (usdtAddress) {
        supportedTokens.push({
          symbol: 'USDT',
          decimals: 6,
          address: usdtAddress
        });
      }
  
      // Fetch all token balances in parallel
      const tokenResults = await Promise.allSettled(
        supportedTokens.map(token => 
          fetchTokenBalance(publicClient as PublicClient, userAddress, token, formatBalance)
        )
      );
  
      // Filter out failed requests and null results
      tokenResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          tokenBalances.push(result.value);
        }
      });
  
      return tokenBalances;
    } catch (error) {
      console.error('Error in fetchFallbackBalances:', error);
      return tokenBalances; // Return any balances we managed to fetch instead of empty array
    }
  },[]);

  const fetchBalances = React.useCallback(async () => {
    if (!address || status !== "connected" || !chainId || !walletProvider) {
      console.log("Wallet not connected or chain not selected");
      return;
    }

    const chainIdAsHex = convertChainIdToHex(parseInt(chainId.toString()));
    const request: WalletGetAssetsRPCRequest = {
      account: address,
      chainFilter: [chainIdAsHex]
    };

    try {
      setIsLoading(true);

      // Check wallet capabilities first
      const capabilities = await getAssetDiscoveryCapabilities(walletProvider, chainIdAsHex, address);

      let assetsResponse;
      
      if (capabilities.hasAssetDiscovery) {
        if (walletProviderType === "WALLET_CONNECT" && capabilities.hasWalletService && capabilities.walletServiceUrl) {
          // Use WalletService to fetch assets
          assetsResponse = await getAssetsViaWalletService(
            request,
            capabilities.walletServiceUrl
          );
        } else {
          console.log("Using direct provider call",{capabilities});
          // Fallback to direct provider call
          assetsResponse = await getAssetsViaProvider(walletProvider, request);
        }

        const assetsObject = assetsResponse.find((item) => chainIdAsHex in item);
        if (assetsObject) {
          const chainAssets = assetsObject[chainIdAsHex];
          if (chainAssets?.length > 0) {
            const tokenBalances = processAssetsToBalances(chainAssets);
            setBalances(tokenBalances);
            return;
          }
        }
      } 
      // If we get here, either asset discovery isn't supported or returned no results
      console.log("Using fallback balance checking");
      const fallbackBalances = await fetchFallbackBalances(address as `0x${string}`, chainIdAsHex);
      setBalances(fallbackBalances);

    } catch (error) {
      console.error("Error fetching assets:", error);
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, status, chainId, walletProvider, getAssetDiscoveryCapabilities, fetchFallbackBalances, walletProviderType, getAssetsViaWalletService, getAssetsViaProvider, processAssetsToBalances]);

  const getBalanceBySymbol = React.useCallback(
    (symbol: string) => {
      return balances.find((b) => b.symbol === symbol)?.balance || "0.00";
    },
    [balances],
  );

  const getBalanceByAddress = React.useCallback(
    (address: Hex) => {
      return balances.find((b) => b.address === address)?.balance || "0.00";
    },
    [balances],
  );

  React.useEffect(() => {
    fetchBalances();
  }, [address, fetchBalances]);

  const value = React.useMemo(
    () => ({
      balances,
      isLoading,
      refetch: fetchBalances,
      getBalanceBySymbol,
      getBalanceByAddress,
    }),
    [
      balances,
      isLoading,
      fetchBalances,
      getBalanceBySymbol,
      getBalanceByAddress,
    ],
  );

  return (
    <WalletAssetsContext.Provider value={value}>
      {children}
    </WalletAssetsContext.Provider>
  );
};

export const useWalletAssets = () => {
  const context = React.useContext(WalletAssetsContext);
  if (context === undefined) {
    throw new Error(
      "useWalletAssets must be used within a WalletAssetsProvider",
    );
  }
  return context;
};
