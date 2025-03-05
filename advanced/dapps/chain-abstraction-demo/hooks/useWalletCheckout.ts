import * as React from "react";
import {
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
} from "@reown/appkit/react";
import UniversalProvider from "@walletconnect/universal-provider";
import { useCallback, useEffect } from "react";

export const useWalletCheckout = () => {
  const { address, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { walletProvider, walletProviderType } =
    useAppKitProvider<UniversalProvider>("eip155");
  const [isWalletCheckoutSupported, setIsWalletCheckoutSupported] =
    React.useState(false);

    const isMethodSupported = useCallback(async ({
      provider,
      method,
      walletProviderType,
    }: {
      provider: UniversalProvider;
      method: string;
      walletProviderType: string;
    }): Promise<{ isSupported: boolean }> => {
      if (walletProviderType === "WALLET_CONNECT") {
        console.log(provider.namespaces);
        const isSupported = Boolean(provider.namespaces?.eip155?.methods?.includes(method));
        return { isSupported };
      }
  
      return { isSupported: false };
    }, []);

  useEffect(() => {
    if (
      address &&
      status === "connected" &&
      walletProvider &&
      walletProviderType
    ) {
      isMethodSupported({
        provider: walletProvider,
        method: "wallet_checkout",
        walletProviderType,
      }).then(({ isSupported }) => {
        setIsWalletCheckoutSupported(isSupported);
      });
    }
  }, [address, status, walletProvider, walletProviderType, isMethodSupported]);


  return {
    isWalletCheckoutSupported,
  };
};
