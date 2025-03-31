"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft } from "lucide-react";
import { getChainLogoUrl, SupportedAsset } from "@/data/CheckoutPaymentAssets";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { useSnapshot } from "valtio";
import { cn } from "@/lib/utils";

export const PaymentOptionsView: React.FC<WalletCheckoutModalViewProps> = ({ 
  onClose, 
  onViewChange 
}) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const availableAssets = snap.state.availableAssets || [];
  const selectedAssetIds = snap.state.paymentOptions.map(option => option.asset);
  
  const [localSelectedAssetIds, setLocalSelectedAssetIds] = useState<string[]>([...selectedAssetIds]);

  // Handle local toggling without updating the parent state immediately
  const handleLocalToggle = (asset: SupportedAsset) => {
    const isSelected = localSelectedAssetIds.includes(asset.id);
    
    if (isSelected) {
      // If it's the only selected asset, don't allow deselection
      if (localSelectedAssetIds.length === 1) {
        return;
      }
      // Remove from selection
      setLocalSelectedAssetIds(localSelectedAssetIds.filter(id => id !== asset.id));
    } else {
      // Add to selection
      setLocalSelectedAssetIds([...localSelectedAssetIds, asset.id]);
    }
  };

  // Apply all changes at once when the Apply button is clicked
  const handleApply = () => {
    // Update selected payment options in the manager
    walletCheckoutManager.setSelectedPaymentAssets(localSelectedAssetIds);
    
    // Navigate back to checkout view
    onViewChange('checkout');
  };

  // When going back, simply navigate without applying changes
  const handleBack = () => {
    onViewChange('checkout');
  };

  // Group assets by chain
  const groupedAssets: Record<string, SupportedAsset[]> = {};
  availableAssets.forEach(asset => {
    if (!groupedAssets[asset.chainName]) {
      groupedAssets[asset.chainName] = [];
    }
    groupedAssets[asset.chainName].push(asset);
  });

  return (
    <div className={cn("flex flex-col items-start gap-4 text-primary")}>
      <div className="grid grid-cols-3 items-center w-full">
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="col-end-3 text-center">
          <h1>Choose payment</h1>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={handleBack}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Payment options list */}
      <div className="flex flex-col gap-4 w-full">
        {Object.entries(groupedAssets).map(([chainName, assets]) => (
          <div key={chainName} className="space-y-2">
            <h3 className="text-sm font-semibold text-secondary">{chainName}</h3>
            <div className="grid grid-cols-2 gap-2">
              {assets.map((asset) => {
                const isSelected = localSelectedAssetIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleLocalToggle(asset)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'border-text-text-accent-primary bg-foreground-foreground-accent-primary-010' 
                        : 'border-border-secondary hover:bg-secondary/50'
                    }`}
                  >
                    <div className="relative">
                      <Image 
                        src={asset.logoUrl} 
                        alt={asset.name} 
                        width={28} 
                        height={28}
                        className="rounded-full"
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <Image 
                          src={getChainLogoUrl(asset.chainId)} 
                          alt={asset.chainName} 
                          width={16} 
                          height={16}
                          className="rounded-full border border-background"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-sm font-medium">{asset.symbol}</span>
                      <span className="text-xs text-secondary">{asset.isNative ? 'Native' : 'Token'}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleApply}
            className="accent-button accent-text"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};