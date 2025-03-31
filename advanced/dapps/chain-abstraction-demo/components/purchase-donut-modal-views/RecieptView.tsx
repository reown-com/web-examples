"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";

export const ReceiptView: React.FC<WalletCheckoutModalViewProps> = ({ onClose }) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const result = snap.state.checkoutResult;
  
  if (!result) {
    return <div>No transaction data available</div>;
  }
  
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
  
  // Helper function to format blockchain explorer URL
  function getExplorerUrl(txid: string): string {
    // Default to Ethereum mainnet
    return `https://etherscan.io/tx/${txid}`;
  }
  
  const explorerUrl = getExplorerUrl(result.txid);
  
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
            <p className="text-primary font-medium">{result.orderId.substring(0, 8)}...</p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-secondary">Amount</p>
            <div className="flex items-center gap-2">
              <p className="text-primary font-medium">{result.amount}</p>
              <div className="payment-option-badge">
                <p>{result.asset}</p>
              </div>
            </div>
          </div>

          {result.recipient && (
            <div className="flex justify-between items-center">
              <p className="text-secondary">Recipient</p>
              <p className="text-primary font-mono">{formatAddress(result.recipient)}</p>
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