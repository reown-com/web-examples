"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { baseSepolia, sepolia } from "viem/chains";
import { getTokenSymbolFromAsset } from "@/utils/WalletCheckoutUtil";
import { supportedPaymentsAsset } from "@/data/CheckoutPaymentAssets";
import { formatUnits } from "viem";

export const ReceiptView: React.FC<WalletCheckoutModalViewProps> = ({ onClose }) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const result = snap.state.checkoutResult;
  
  if (!result) {
    return <div>No transaction data available</div>;
  }
  
  const { orderId, txid, recipient, asset, amount } = result;
  const tokenSymbol = getTokenSymbolFromAsset(asset);
  
  // Format timestamp
  const timestamp = new Date().toLocaleString();
  
  // Truncate address for display
  function formatAddress(address?: string): string {
    if (!address) {
      return 'N/A';
    }
    const parts = address.split(':');
    const addr = parts[parts.length - 1];
    
    if (!addr) {
      return 'N/A';
    }
    
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  /*
  * Extract chain ID and token address from a CAIP-19 asset identifier
  */
 function extractAssetInfo(asset: string): {
   chainNamespace: string
   chainId: string
   tokenAddress?: string
   isNative: boolean
 } {
   const parts = asset.split('/')
   const chainPart = parts[0]?.split(':') || []
   const chainNamespace = chainPart[0] || ''
   const chainId = chainPart[1] || ''
 
   // Check if this is a native asset (slip44:60 is ETH)
   if (parts[1]?.startsWith('slip44:')) {
     return { chainNamespace, chainId, isNative: true }
   }
 
   // For ERC20 tokens
   if (parts[1]?.startsWith('erc20:')) {
     const tokenAddress = parts[1].split(':')[1]
 
     return { chainNamespace, chainId, tokenAddress, isNative: false }
   }
 
   // Default case
   return { chainNamespace, chainId, isNative: !parts[1] }
 }
  // Helper function to format blockchain explorer URL
  function getExplorerUrl(txid: string, asset?: string): string {
    if (!asset) {
      return `https://sepolia.etherscan.io/tx/${txid}`
    }
  
    const { chainNamespace, chainId } = extractAssetInfo(asset)
    if (chainNamespace === 'solana') {
      if (chainId === 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1') {
        return `https://solscan.io/tx/${txid}?cluster=devnet`
      }
  
      return `https://solscan.io/tx/${txid}`
    }
  
    const chainIdNum = Number(chainId)
  
    if (chainIdNum === sepolia.id) {
      return `https://sepolia.etherscan.io/tx/${txid}`
    }
  
    if (chainIdNum === baseSepolia.id) {
      return `https://sepolia.basescan.org/tx/${txid}`
    }
  
    // Default to Sepolia explorer
    return `https://sepolia.etherscan.io/tx/${txid}`
  }
  
  const getFormattedAmount = (inputAsset: string, inputAmount: string) => {
    if (!inputAsset || !inputAmount) {
      return 
    }
    const supportedAssets = supportedPaymentsAsset
    const supportedAsset = supportedAssets.find((asset) => asset.id === inputAsset)
    if (!supportedAsset) {
      return 
    }
    const formatedAmount = formatUnits(BigInt(inputAmount), supportedAsset?.decimals)
    return formatedAmount
  }

  const getAssetName = (inputAsset: string) => {
    if (!inputAsset) {
      return 'UNSUPPORTED ASSET'
    }
    const supportedAssets = supportedPaymentsAsset
    const supportedAsset = supportedAssets.find((asset) => asset.id === inputAsset)
    if (!supportedAsset) {
      return 'UNSUPPORTED ASSET'
    }
    return supportedAsset.name
  }

   const explorerUrl = getExplorerUrl(txid, asset)
  const formattedAmount = getFormattedAmount(asset!, amount!) || 'UNSUPPORTED ASSET'
  
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Success Header */}
      <div className="flex justify-center w-full">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <div className="icon-container bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-primary">Payment Successful</h3>
          <p className="text-sm text-secondary mt-1">{timestamp}</p>
        </div>
      </div>

      {/* Transaction Details Card */}
      <div className="w-full bg-primary-foreground p-4 rounded-3xl">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-secondary">Order ID</p>
            <p className="text-primary font-medium">{orderId.substring(0, 8)}...</p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-secondary">Amount</p>
            <div className="flex items-center gap-2">
              <p className="text-secondary font-medium">{formattedAmount}</p>
              <p className="text-secondary font-medium">{getAssetName(asset!)}</p>
            </div>
          </div>

          {result.recipient && (
            <div className="flex justify-between items-center">
              <p className="text-secondary">Recipient</p>
              <p className="text-primary font-mono">{formatAddress(recipient)}</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-secondary">Transaction</p>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="accent-text hover:underline font-mono"
            >
              {result.txid.substring(0, 6)}...{result.txid.substring(result.txid.length - 4)}
            </a>
          </div>
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 w-full mt-2">
        <Button
          onClick={onClose}
          className="flex flex-1 gap-1 accent-button"
        >
          <p className="flex items-center accent-text">
            Done <ArrowRight className="w-4 h-4 ml-1" />
          </p>
        </Button>
      </div>
    </div>
  );
};