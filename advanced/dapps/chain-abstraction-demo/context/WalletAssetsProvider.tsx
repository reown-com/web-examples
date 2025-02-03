import * as React from "react";
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { base } from "viem/chains";
import UniversalProvider from '@walletconnect/universal-provider'
import { usdcTokenAddresses, usdtTokenAddresses } from "@/consts/tokens";
import { RpcRequest } from 'ox';
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

interface WalletGetAssetsResponse {
  jsonrpc: string;
  id: number;
  result: Record<Hex, Asset[]>[];
}

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
const WalletAssetsContext = React.createContext<WalletAssetsContextType | undefined>(undefined);

export const WalletAssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, status } = useAppKitAccount();
  const {walletProvider, walletProviderType} = useAppKitProvider<UniversalProvider>("eip155");
  const [balances, setBalances] = React.useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const formatBalance = (balance: bigint, decimals: number): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    
    if (value >= 0.01) {
      return value.toFixed(2);
    }
    
    // For very small amounts, show more precision but limit to the token's decimals
    const significantDecimals = Math.min(6, decimals);
    return value.toFixed(significantDecimals).replace(/\.?0+$/, '');
  };

  const fetchBalances = React.useCallback(async () => {
    const chainIdAsHex = `0x${base.id.toString(16)}` as Hex;
    if (!address || status !== 'connected') return;
    let capabilities: Capabilities = {}
    if(walletProviderType == 'WALLET_CONNECT'){
      capabilities = walletProvider.session?.sessionProperties?.['capabilities'] ? JSON.parse(walletProvider.session.sessionProperties?.['capabilities']) : {}
    }
    else {
      capabilities = await walletProvider.request({
        method: 'wallet_getCapabilities',
        params: [address],
      });
    }
   
    const walletGetAssetsUrl = capabilities[chainIdAsHex]?.['walletService']?.['wallet_getAssets']
    if(!walletGetAssetsUrl){
      console.log('Wallet does not support wallet_getAssets')
      return
    }

    setIsLoading(true);
    const walletGetAssetsRequest = {
      "account": address,
      "assetFilter": {
        [chainIdAsHex]: [
          usdcTokenAddresses[base.id],
          usdtTokenAddresses[base.id],
          'native'
        ],
      },
    };

    const store = RpcRequest.createStore();
    const request = store.prepare({
      method: 'wallet_getAssets',
      params: [walletGetAssetsRequest]
    });

    try {
      const url = new URL(walletGetAssetsUrl);
      url.searchParams.set('projectId', projectId!);
      const response = await fetch(url.toString(), {
        body: JSON.stringify(request),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const walletGetAssetsResponse = await response.json() as WalletGetAssetsResponse;
      const assetsObject = walletGetAssetsResponse.result.find(item => chainIdAsHex in item);
      
      if (assetsObject) {
        const chainAssets = assetsObject[chainIdAsHex];
        if (chainAssets && chainAssets.length > 0) {
          const tokenBalances = chainAssets.map(asset => {
            const balanceValue = BigInt(asset.balance);
            
            return {
              symbol: asset.metadata.symbol,
              balance: formatBalance(balanceValue, asset.metadata.decimals),
              address: asset.address as Hex,
            };
          });
          
          setBalances(tokenBalances);
        }
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, status, walletProvider, walletProviderType]);

  const getBalanceBySymbol = React.useCallback((symbol: string) => {
    return balances.find(b => b.symbol === symbol)?.balance || "0.00";
  }, [balances]);

  const getBalanceByAddress = React.useCallback((address: Hex) => {
    return balances.find(b => b.address === address)?.balance || "0.00";
  }, [balances]);

  React.useEffect(() => {
    fetchBalances();
  }, [address, fetchBalances]);

  const value = React.useMemo(() => ({
    balances,
    isLoading,
    refetch: fetchBalances,
    getBalanceBySymbol,
    getBalanceByAddress,
  }), [balances, isLoading, fetchBalances, getBalanceBySymbol, getBalanceByAddress]);

  return (
    <WalletAssetsContext.Provider value={value}>
      {children}
    </WalletAssetsContext.Provider>
  );
};

export const useWalletAssets = () => {
  const context = React.useContext(WalletAssetsContext);
  if (context === undefined) {
    throw new Error('useWalletAssets must be used within a WalletAssetsProvider');
  }
  return context;
};