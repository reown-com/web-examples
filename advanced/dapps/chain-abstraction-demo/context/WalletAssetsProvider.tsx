import * as React from "react";
import {
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
} from "@reown/appkit/react";
import UniversalProvider from "@walletconnect/universal-provider";
import { RpcRequest } from "ox";
import { projectId } from "@/config";
import { convertChainIdToHex, formatBalance } from "@/utils/FormatterUtil";
import {
  fetchFallbackBalances,
  type TokenBalance,
} from "@/utils/BalanceFetcherUtil";
import {
  Asset,
  WalletGetAssetsRPCRequest,
  WalletGetAssetsRPCResponse,
} from "@/types/ERC7811";
import { Capabilities } from "@/types/ERC5792";

interface WalletAssetsContextType {
  balances: TokenBalance[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  getBalanceBySymbol: (symbol: string) => string;
  getBalanceByAddress: (address: `0x${string}`) => string;
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

  const processAssetsToBalances = React.useCallback(
    (chainAssets: Asset[], chainId: number): TokenBalance[] =>
      chainAssets.map((asset) => ({
        symbol: asset.metadata.symbol,
        balance: formatBalance(BigInt(asset.balance), asset.metadata.decimals),
        address: asset.address as `0x${string}`,
        chainId,
      })),
    [],
  );

  const getAssetDiscoveryCapabilities = React.useCallback(
    async (
      provider: UniversalProvider,
      chainIdAsHex: `0x${string}`,
      userAddress: string,
    ): Promise<{
      hasAssetDiscovery: boolean;
      hasWalletService: boolean;
      walletServiceUrl?: string;
    }> => {
      try {
        const capabilities = (await provider.request({
          method: "wallet_getCapabilities",
          params: [userAddress],
        })) as Capabilities;

        const hasAssetDiscovery =
          capabilities[chainIdAsHex]?.assetDiscovery?.supported ?? false;
        if (!hasAssetDiscovery) {
          return {
            hasAssetDiscovery: false,
            hasWalletService: false,
          };
        }
        // For WalletConnect, also check CAIP-25
        let walletServiceUrl;
        if (walletProviderType === "WALLET_CONNECT") {
          const sessionCapabilities = JSON.parse(
            provider.session?.sessionProperties?.["capabilities"] || "{}",
          );
          walletServiceUrl =
            sessionCapabilities[chainIdAsHex]?.["walletService"]?.[
              "wallet_getAssets"
            ];
        }

        return {
          hasAssetDiscovery,
          hasWalletService: !!walletServiceUrl,
          walletServiceUrl,
        };
      } catch (error) {
        console.error("Error checking wallet capabilities:", error);
        return {
          hasAssetDiscovery: false,
          hasWalletService: false,
        };
      }
    },
    [walletProviderType],
  );

  const getAssetsViaWalletService = React.useCallback(
    async (
      request: WalletGetAssetsRPCRequest,
      walletServiceUrl: string,
    ): Promise<Record<`0x${string}`, Asset[]>[]> => {
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

      const { result } = (await response.json()) as WalletGetAssetsRPCResponse;
      return result;
    },
    [],
  );

  const getAssetsViaProvider = React.useCallback(
    async (
      provider: UniversalProvider,
      request: WalletGetAssetsRPCRequest,
    ): Promise<Record<`0x${string}`, Asset[]>[]> => {
      const response = (await provider.request({
        method: "wallet_getAssets",
        params: [request],
      })) as Record<`0x${string}`, Asset[]>;

      return [response];
    },
    [],
  );

  const fetchBalances = React.useCallback(async () => {
    if (!address || status !== "connected" || !chainId || !walletProvider) {
      return;
    }

    const chainIdAsHex = convertChainIdToHex(parseInt(chainId.toString()));
    const request: WalletGetAssetsRPCRequest = {
      account: address,
      chainFilter: [chainIdAsHex],
    };

    try {
      setIsLoading(true);

      // Check wallet capabilities first
      const capabilities = await getAssetDiscoveryCapabilities(
        walletProvider,
        chainIdAsHex,
        address,
      );

      let assetsResponse;
      if (capabilities.hasAssetDiscovery) {
        if (
          walletProviderType === "WALLET_CONNECT" &&
          capabilities.hasWalletService &&
          capabilities.walletServiceUrl
        ) {
          // Use WalletService to fetch assets
          assetsResponse = await getAssetsViaWalletService(
            request,
            capabilities.walletServiceUrl,
          );
        } else {
          console.log("Using direct provider call", { capabilities });
          // Fallback to direct provider call
          assetsResponse = await getAssetsViaProvider(walletProvider, request);
          console.log("Got assets via provider", assetsResponse);
        }

        const assetsObject = assetsResponse.find(
          (item) => chainIdAsHex in item,
        );
        if (assetsObject) {
          const chainAssets = assetsObject[chainIdAsHex];
          if (chainAssets?.length > 0) {
            const tokenBalances = processAssetsToBalances(
              chainAssets,
              parseInt(chainId.toString()),
            );
            setBalances(tokenBalances);
            return;
          }
        }
      }
      // If we get here, either asset discovery isn't supported or returned no results
      console.log("Using fallback balance checking");
      const fallbackBalances = await fetchFallbackBalances(
        address as `0x${string}`,
        chainIdAsHex,
      );
      setBalances(fallbackBalances);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    status,
    chainId,
    walletProvider,
    getAssetDiscoveryCapabilities,
    walletProviderType,
    getAssetsViaWalletService,
    getAssetsViaProvider,
    processAssetsToBalances,
  ]);

  const getBalanceBySymbol = React.useCallback(
    (symbol: string) => {
      return balances.find((b) => b.symbol === symbol)?.balance || "0.00";
    },
    [balances],
  );

  const getBalanceByAddress = React.useCallback(
    (address: `0x${string}`) => {
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
