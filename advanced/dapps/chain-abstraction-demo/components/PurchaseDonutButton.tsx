import { useWalletCheckout } from "@/hooks/useWalletCheckout"
import { Button } from "@/components/ui/button"
import { useAppKitProvider } from "@reown/appkit/react"
import UniversalProvider from '@walletconnect/universal-provider'
import { toast } from "sonner"
import { useEffect, useRef } from "react"
import { walletCheckoutManager } from "@/controllers/WalletCheckoutModalManager"
import { ReceiptView } from "./purchase-donut-modal-views/RecieptView"
import { ErrorView } from "./purchase-donut-modal-views/ErrorView"
import { WalletCheckoutModal } from "./WalletCheckoutModal"
import { CheckoutView } from "./purchase-donut-modal-views/CheckoutView"

const DONUT_PRICE = 0.1

const PRODUCT_METADATA = {
  name: 'Chocolate sprinkle Delight',
  description: 'Donut with extra chocolate sprinkles on top',
  imageUrl: 'https://ca-demo.reown.com/donut.png',
  price: `$${DONUT_PRICE}`
}

// Initialize the checkout manager's product data
const initializeCheckoutManager = () => {
  // Set the product in the manager
  walletCheckoutManager.getState().state.product = PRODUCT_METADATA;
  
  // Register all the views if they haven't been registered yet
  if (!Object.keys(walletCheckoutManager.getState().views).length) {
    walletCheckoutManager.registerView("checkout", {
      component: CheckoutView,
    });
    
    walletCheckoutManager.registerView("receipt", {
      component: ReceiptView,
    });
    
    walletCheckoutManager.registerView("error", {
      component: ErrorView,
    });
  }
}

const PurchaseDonutButton = () => {
  const { isWalletCheckoutSupported, getPaymentsOptions } = useWalletCheckout()
  const { walletProvider } = useAppKitProvider<UniversalProvider>('eip155')
  // Use refs to track the state and prevent duplicate toasts
  const successToastShown = useRef(false);
  const errorToastShown = useRef(false);
  const lastResult = useRef<string | null>(null);
  const lastError = useRef<string | null>(null);
  
  // Initialize checkout manager when the component mounts
  useEffect(() => {
    initializeCheckoutManager();
    
    // Load payment options when component mounts
    const loadPaymentOptions = async () => {
      if (isWalletCheckoutSupported) {
        try {
          const options = await getPaymentsOptions();
          walletCheckoutManager.setPaymentOptions(options);
        } catch (error) {
          console.error("Failed to load payment options:", error);
        }
      }
    };
    
    loadPaymentOptions();
  }, [getPaymentsOptions, isWalletCheckoutSupported]);
  
  // Set up a listener for checkout results to show toast notifications
  useEffect(() => {
    // Reset the toast flags whenever component mounts or remounts
    successToastShown.current = false;
    errorToastShown.current = false;
    lastResult.current = null;
    lastError.current = null;
    
    // Create a subscription directly from the manager
    const unsubscribe = walletCheckoutManager.subscribe((state) => {
      // Check for successful transaction
      if (state.state.checkoutResult && !state.state.error) {
        const resultId = state.state.checkoutResult.txid || state.state.checkoutResult.orderId;
        
        // Only show toast if this is a new result and toast hasn't been shown
        if (!successToastShown.current || lastResult.current !== resultId) {
          toast.success('Checkout successful', {
            description: 'Your payment has been processed successfully!',
            id: 'checkout-success', // Using an ID prevents duplicate toasts
          });
          
          // Mark that we've shown the success toast for this result
          successToastShown.current = true;
          lastResult.current = resultId;
          
          // Reset error toast flag when we get a success
          errorToastShown.current = false;
        }
      } 
        // Check for error
      else if (state.state.error) {
        const errorMessage = typeof state.state.error === 'object' && state.state.error !== null && 'message' in state.state.error
          ? state.state.error.message as string
          : 'An error occurred during checkout';
        
        // Only show toast if this is a new error and toast hasn't been shown
        if (!errorToastShown.current || lastError.current !== errorMessage) {
          toast.error('Checkout failed', {
            description: errorMessage,
            id: 'checkout-error', // Using an ID prevents duplicate toasts
          });
          
          // Mark that we've shown the error toast for this error
          errorToastShown.current = true;
          lastError.current = errorMessage;
          
          // Reset success toast flag when we get an error
          successToastShown.current = false;
        }
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handlePurchaseDonut = async () => {
    if (!isWalletCheckoutSupported || !walletProvider) {
      toast.error('Wallet checkout not supported', {
        description: 'Your wallet does not support the checkout feature',
      });
      return;
    }
    
    // Reset any previous state
    walletCheckoutManager.resetTransactionState();
    
    // Reset the toast tracking flags when starting a new checkout
    successToastShown.current = false;
    errorToastShown.current = false;
    lastResult.current = null;
    lastError.current = null;
    
    // Configure the manager with wallet provider
    walletCheckoutManager.setWalletProvider(walletProvider);
    
    // Open the checkout modal
    walletCheckoutManager.open("checkout");
  }

  return (
    <>
      <Button onClick={handlePurchaseDonut} disabled={!isWalletCheckoutSupported}>
        Purchase Donut
      </Button>
      
      {/* Include the modal component */}
      <WalletCheckoutModal />
    </>
  );
}

export default PurchaseDonutButton