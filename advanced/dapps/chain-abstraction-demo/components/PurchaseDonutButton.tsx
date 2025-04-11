import { useWalletCheckout } from "@/hooks/useWalletCheckout"
import { Button } from "@/components/ui/button"
import { useAppKitProvider } from "@reown/appkit/react"
import UniversalProvider from '@walletconnect/universal-provider'
import { toast } from "sonner"
import { useEffect, useRef } from "react"
import { walletCheckoutManager } from "@/controllers/WalletCheckoutModalManager"
import { WalletCheckoutModal } from "./WalletCheckoutModal"
import { registerCheckoutViews } from "@/config/checkoutViews"


const initializeCheckoutManager = () => {
  registerCheckoutViews();
}

const PurchaseDonutButton = () => {
  const { isWalletCheckoutSupported, getPreConfiguredPaymentsOptions } = useWalletCheckout()
  const { walletProvider } = useAppKitProvider<UniversalProvider>('eip155')
  
  // Initialize checkout manager when the component mounts
  useEffect(() => {
    initializeCheckoutManager();
    
    // Configure payment options when component mounts
    const configurePaymentsOptions = async () => {
      if (isWalletCheckoutSupported) {
        try {
          const options = await getPreConfiguredPaymentsOptions();
          walletCheckoutManager.setPaymentOptions(options);
        } catch (error) {
          console.error("Failed to configure payment options:", error);
        }
      }
    };
    
    configurePaymentsOptions();
  }, [getPreConfiguredPaymentsOptions, isWalletCheckoutSupported]);
  
  const handlePurchaseDonut = async () => {
    if (!isWalletCheckoutSupported || !walletProvider) {
      toast.error('Wallet checkout not supported', {
        description: 'Your wallet does not support the checkout feature',
      });
      return;
    }
    walletCheckoutManager.resetTransactionState();
    walletCheckoutManager.setWalletProvider(walletProvider);
    walletCheckoutManager.open("checkout");
  }

  return (
    <>
      <Button onClick={handlePurchaseDonut} disabled={!isWalletCheckoutSupported}>
        Purchase Donut
      </Button>
      <WalletCheckoutModal />
    </>
  );
}

export default PurchaseDonutButton