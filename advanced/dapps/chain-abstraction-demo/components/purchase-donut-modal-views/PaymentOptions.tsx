"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useWalletCheckout } from "@/hooks/useWalletCheckout";
import { Plus } from "lucide-react";
import { walletCheckoutManager } from "@/controllers/WalletCheckoutModalManager";
import { useSnapshot } from "valtio";
import { supportedPaymentsAsset, supportChains } from "@/data/CheckoutPaymentAssets";
import { PaymentOptionsView } from "./PaymentOptionsView";

// Simplified component that doesn't need to receive props
export const PaymentOptions: React.FC = () => {
  const { getPaymentsOptions } = useWalletCheckout();
  const snap = useSnapshot(walletCheckoutManager.getState());
  
  // Get available assets and selected assets from the manager state
  const availableAssets = snap.state.availableAssets || [];
  const selectedAssetIds = snap.state.paymentOptions.map(option => option.asset);
  const selectedAssets = availableAssets.filter(asset => 
    selectedAssetIds.includes(asset.id)
  );

  // Find the chain logo URL for an asset
  const getChainLogoUrl = (chainId: string): string => {
    const chain = supportChains.find(chain => chain.id.includes(chainId));
    return chain?.logoUrl || '';
  };

  useEffect(() => {
    const fetchPaymentOptions = async () => {
      try {
        const options = await getPaymentsOptions();
        
        // Filter available assets based on payment options
        const availableAssetIds = options.map(option => option.asset);
        const filteredAssets = supportedPaymentsAsset.filter(
          asset => availableAssetIds.includes(asset.id)
        );
        
        // Update wallet checkout manager with all data
        walletCheckoutManager.setAvailableAssets(filteredAssets);
        
        // If there are no payment options set yet, initialize with the first available option
        if (walletCheckoutManager.getPaymentOptions().length === 0 && options.length > 0) {
          // Select the first payment option by default
          const defaultOption = [options[0]];
          walletCheckoutManager.setPaymentOptions(defaultOption);
        }
        
        // Ensure the manager has the full list of options to choose from
        walletCheckoutManager.setAllPaymentOptions(options);
      } catch (error) {
        console.error("Error fetching payment options:", error);
      }
    };
    
    fetchPaymentOptions();
  }, [getPaymentsOptions]);

  // Open the payment options modal view
  const openPaymentOptionsModal = () => {
    // Register the PaymentOptionsModalView if not already registered
    if (!snap.views['paymentOptions']) {
      walletCheckoutManager.registerView('paymentOptions', {
        component: PaymentOptionsView,
        title: 'Select Payment Options'
      });
    }
    
    // Navigate to the payment options view
    walletCheckoutManager.switchView('paymentOptions');
  };

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {selectedAssets.slice(0, 2).map(asset => (
        <button
          key={asset.id}
          onClick={openPaymentOptionsModal}
          className="payment-option-badge transition-all hover:ring-2 hover:ring-text-text-accent-primary"
        >
          <div className="relative">
            <Image 
              src={asset.logoUrl} 
              alt={asset.name} 
              width={24} 
              height={24}
              className="rounded-full"
            />
            <div className="absolute -bottom-1 -right-1">
              <Image 
                src={getChainLogoUrl(asset.chainId) || '/chain-logos/chain-placeholder.svg'} 
                alt={asset.chainName} 
                width={14} 
                height={14}
                className="rounded-full border border-background"
              />
            </div>
          </div>
          {""}
        </button>
      ))}
      
      {/* Show a badge indicating more options if we have more than 2 */}
      {selectedAssets.length > 2 && (
        <button
          onClick={openPaymentOptionsModal}
          className="payment-option-badge transition-all hover:ring-2 hover:ring-text-text-accent-primary"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground-foreground-secondary text-primary text-xs font-medium">
            +{selectedAssets.length - 2}
          </div>
        </button>
      )}
      
      {/* Edit button to open modal for adding more payment options */}
      <button
        onClick={openPaymentOptionsModal}
        className="payment-option-badge h-8 w-8 flex items-center justify-center transition-all hover:ring-2 hover:ring-text-text-accent-primary"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};