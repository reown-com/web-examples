"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft } from "lucide-react";
import { getChainLogoUrl, SupportedAsset } from "@/data/CheckoutPaymentAssets";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { PaymentOption } from "@/types/wallet_checkout";
import { useSnapshot } from "valtio";
import { cn } from "@/lib/utils";
import { formatUnits } from "viem";

export const PaymentOptionsView: React.FC<WalletCheckoutModalViewProps> = ({ 
  onClose, 
  onViewChange 
}) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const availableAssets = snap.state.availableAssets || [];
  const allPaymentOptions = snap.state.allPaymentOptions || [];
  
  const getPaymentOptionId = (option: PaymentOption): string => {
    const baseId = `${option.asset}`;
    
    const typeId = option.contractInteraction ? '-contract' : '-direct';
    
    const recipientId = option.recipient ? `-${option.recipient.slice(-8)}` : '';
    
    const amountId = option.amount ? `-${option.amount.slice(-6)}` : '';
    
    return `${baseId}${typeId}${recipientId}${amountId}`;
  };
  
  const [localSelectedOptionIds, setLocalSelectedOptionIds] = useState<string[]>([]);
  
  useEffect(() => {
    const selectedPaymentOptions = snap.state.paymentOptions || [];
    const selectedIds = selectedPaymentOptions.map(option => getPaymentOptionId(option));
    setLocalSelectedOptionIds(selectedIds);
  }, [snap.state.paymentOptions]);
  
  const getPaymentOptionById = (optionId: string): PaymentOption | undefined => {
    return allPaymentOptions.find(option => getPaymentOptionId(option) === optionId);
  };
  
  const handlePaymentOptionToggle = (option: PaymentOption) => {
    const optionId = getPaymentOptionId(option);
    const isSelected = localSelectedOptionIds.includes(optionId);
    
    if (isSelected) {
      if (localSelectedOptionIds.length === 1) {
        return;
      }
      setLocalSelectedOptionIds(localSelectedOptionIds.filter(id => id !== optionId));
    } else {
      setLocalSelectedOptionIds([...localSelectedOptionIds, optionId]);
    }
  };
  
  // Apply selections when user clicks Apply
  const handleApply = () => {
    // Convert selected option IDs back to payment options
    const selectedOptions = localSelectedOptionIds
      .map(optionId => getPaymentOptionById(optionId))
      .filter((option): option is PaymentOption => !!option);
    
    walletCheckoutManager.setPaymentOptions(selectedOptions);
    onViewChange('checkout');
  };

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

  // Get all payment options for an asset (could be multiple - direct and contract)
  const getAllPaymentOptionsForAsset = (assetId: string): PaymentOption[] => {
    return allPaymentOptions.filter(option => option.asset === assetId);
  };

  // Format amount for display
  const formatAmount = (paymentOption?: PaymentOption, asset?: SupportedAsset): string => {
    if (!paymentOption?.amount || !asset) return "N/A";
    
    try {
      // Remove '0x' prefix and parse the hex amount
      const amountHex = paymentOption.amount.startsWith('0x') 
        ? paymentOption.amount.substring(2) 
        : paymentOption.amount;
      
      const amountBigInt = BigInt(`0x${amountHex}`);
      const formattedAmount = formatUnits(amountBigInt, asset.decimals);
      
      // Format to max 6 decimal places
      const parts = formattedAmount.split('.');
      if (parts.length === 2 && parts[1].length > 6) {
        return `${parts[0]}.${parts[1].substring(0, 6)}`;
      }
      
      return formattedAmount;
    } catch (e) {
      console.error("Error formatting amount:", e);
      return "Error";
    }
  };

  // Format recipient address for display
  const formatRecipient = (paymentOption?: PaymentOption): string => {
    if (!paymentOption?.recipient) return "Smart Contract";
    
    const parts = paymentOption.recipient.split(':');
    const address = parts[parts.length - 1];
    
    if (!address) return "Unknown";
    
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get payment option type (direct payment or contract interaction)
  const getPaymentType = (paymentOption?: PaymentOption): string => {
    if (!paymentOption) return "Unknown";
    
    if (paymentOption.contractInteraction) {
      return "Contract Interaction";
    }
    
    return "Direct Payment";
  };

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
      
      {/* Payment options list with basic scrolling */}
      <div className="flex flex-col gap-4 w-full max-h-[70vh] overflow-y-auto">
        {Object.entries(groupedAssets).map(([chainName, assets]) => (
          <div key={chainName} className="space-y-2 mb-4">
            <h3 className="text-sm font-semibold text-secondary">{chainName}</h3>
            <div className="grid grid-cols-1 gap-2">
              {assets.map((asset) => {
                const assetPaymentOptions = getAllPaymentOptionsForAsset(asset.id);
                
                return assetPaymentOptions.map((option) => {
                  const optionId = getPaymentOptionId(option);
                  const isSelected = localSelectedOptionIds.includes(optionId);
                  const amount = formatAmount(option, asset);
                  const recipient = formatRecipient(option);
                  const paymentType = getPaymentType(option);
                  
                  return (
                    <button
                      key={optionId}
                      onClick={() => handlePaymentOptionToggle(option)}
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
                      
                      {/* Payment option details */}
                      <div className="flex flex-col items-start flex-1">
                        <div className="flex justify-between w-full">
                          <span className="text-sm font-medium">{asset.symbol}</span>
                          <span className="text-sm font-medium">{amount} {asset.symbol}</span>
                        </div>
                        <div className="flex justify-between w-full">
                          <span className="text-xs text-secondary">{paymentType}</span>
                          <span className="text-xs text-secondary">To: {recipient}</span>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="h-5 w-5 text-green-500 ml-2" />
                      )}
                    </button>
                  );
                });
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Apply button */}
      <div className="flex justify-end mt-4 w-full">
        <Button 
          onClick={handleApply}
          className="accent-button accent-text"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};