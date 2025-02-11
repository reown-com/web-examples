import * as React from "react";
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from "@reown/appkit/react";
import { base, optimism } from "viem/chains";
import UniversalProvider from "@walletconnect/universal-provider";
import { usdcTokenAddresses, usdtTokenAddresses } from "@/consts/tokens";
import { RpcRequest } from "ox";
import { projectId } from "@/config";
import { Hex } from "viem";

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

interface Asset {
  address: Hex | "native";
  balance: Hex;
  type: string;
  metadata: TokenMetadata;
}

interface WalletGetAssetsRPCResponse {
  jsonrpc: string;
  id: number;
  result: Record<Hex, Asset[]>[];
}

type WalletAssetRequest = {
  account: string;
  chainFilter?: Hex[];
  assetFilter?: Record<Hex, (Hex|'native')[]>;
  assetTypeFilter?: ('NATIVE'|'ERC20')[];
};

export interface TokenBalance {
  symbol: string;
  balance: string;
  address: Hex;
}

interface WalletCapability {
  wallet_getAssets?: string;
}

interface ChainCapabilities {
  walletService?: WalletCapability;
  assetDiscovery?: {
    supported: boolean;
  };
}

interface Capabilities {
  [chainId: string]: ChainCapabilities;
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
  const { chainId } = useAppKitNetwork()
  const { walletProvider, walletProviderType } =
    useAppKitProvider<UniversalProvider>("eip155");
  const [balances, setBalances] = React.useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const formatBalance = (balance: bigint, decimals: number): string => {
    const value = Number(balance) / Math.pow(10, decimals);

    if (value >= 0.01) {
      return value.toFixed(2);
    }

    // For very small amounts, show more precision but limit to the token's decimals
    const significantDecimals = Math.min(6, decimals);
    return value.toFixed(significantDecimals).replace(/\.?0+$/, "");
  };
// Utility functions
const convertChainIdToHex = (chainId: number): Hex => {
  return `0x${parseInt(chainId.toString()).toString(16)}` as Hex;
};

const processAssetsToBalances = (chainAssets: Asset[]): TokenBalance[] => {
  return chainAssets.map((asset) => ({
    symbol: asset.metadata.symbol,
    balance: formatBalance(BigInt(asset.balance), asset.metadata.decimals),
    address: asset.address as Hex,
  }));
};

// WalletConnect specific functions
const getWalletConnectAssets = async (
  walletProvider: UniversalProvider,
  request: WalletAssetRequest,
  chainIdAsHex: Hex,
  projectId: string
): Promise<Record<Hex, Asset[]>[]> => {
  const capabilities = JSON.parse(
    walletProvider.session?.sessionProperties?.["capabilities"] || "{}"
  );
  
  const walletGetAssetsUrl = capabilities[chainIdAsHex]?.["walletService"]?.["wallet_getAssets"];
  if (!walletGetAssetsUrl) {
    throw new Error("Wallet does not support wallet_getAssets");
  }

  const store = RpcRequest.createStore();
  const rpcRequest = store.prepare({
    method: "wallet_getAssets",
    params: [request],
  });

  const url = new URL(walletGetAssetsUrl);
  url.searchParams.set("projectId", projectId);

  const response = await fetch(url.toString(), {
    body: JSON.stringify(rpcRequest),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const { result } = await response.json() as WalletGetAssetsRPCResponse;
  return result;
};

// Embedded Wallet specific functions
const getEmbeddedWalletAssets = async (
  walletProvider: UniversalProvider,
  request: WalletAssetRequest,
  chainIdAsHex: Hex,
  address: string
): Promise<Record<Hex, Asset[]>[]> => {
  const capabilities = await walletProvider.request({
    method: "wallet_getCapabilities",
    params: [address]
  }) as Capabilities;

  if (!capabilities[chainIdAsHex]?.assetDiscovery?.supported) {
    throw new Error("Wallet does not support wallet_getAssets");
  }

  const response = await walletProvider.request({
    method: "wallet_getAssets",
    params: [request],
  }) as Record<Hex, Asset[]>;

  return [response];
};

// Main fetch function
const fetchBalances = React.useCallback(async () => {
  if (!address || status !== "connected" || !chainId || !walletProvider) {
    console.log("Required conditions not met");
    return;
  }

  const chainIdAsHex = convertChainIdToHex(parseInt(chainId.toString()));
  const request: WalletAssetRequest = {
    account: address,
    chainFilter: [chainIdAsHex]
  };

  try {
    setIsLoading(true);
    
    const assetsResponse = await (walletProviderType === "WALLET_CONNECT" 
      ? getWalletConnectAssets(walletProvider, request, chainIdAsHex, projectId!)
      : getEmbeddedWalletAssets(walletProvider, request, chainIdAsHex, address)
    );

    const assetsObject = assetsResponse.find((item) => chainIdAsHex in item);
    if (assetsObject) {
      const chainAssets = assetsObject[chainIdAsHex];
      if (chainAssets?.length > 0) {
        const tokenBalances = processAssetsToBalances(chainAssets);
        setBalances(tokenBalances);
      }
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
  } finally {
    setIsLoading(false);
  }
}, [address, status, chainId, walletProvider, walletProviderType]);

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
