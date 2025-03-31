"use client";

import React, { useEffect } from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { CheckoutErrorCode } from "@/types/wallet_checkout";

// Error View
export const ErrorView: React.FC<WalletCheckoutModalViewProps> = ({ onClose, onViewChange }) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const { error } = snap.state;
  
  // Determine the error message to display
  const getErrorMessage = () => {
    // If there's an error object with code and message properties (CheckoutError)
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const typedError = error as { code: number; message: string };
      
      // Handle known error codes with user-friendly messages
      switch (typedError.code) {
        case CheckoutErrorCode.USER_REJECTED:
          return "You cancelled the transaction.";
        case CheckoutErrorCode.NO_MATCHING_ASSETS:
          return "You don't have any of the required assets for this payment.";
        case CheckoutErrorCode.CHECKOUT_EXPIRED:
          return "This payment request has expired. Please try again.";
        case CheckoutErrorCode.INSUFFICIENT_FUNDS:
          return "You don't have enough funds to complete this payment.";
        case CheckoutErrorCode.METHOD_NOT_FOUND:
          return "Your wallet doesn't support this payment method.";
        case CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION:
          return "This payment method is not supported for this contract.";
        case CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA:
          return "The contract interaction data is invalid.";
        case CheckoutErrorCode.CONTRACT_INTERACTION_FAILED:
          return "The contract interaction failed.";
        default:
          return typedError.message || "Transaction failed.";
      }
    }
    
    // If there's an error object with a message property
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    
    // If error is a string, return it directly
    if (typeof error === 'string') {
      return error;
    }
    
    // Default error message
    return "The transaction could not be completed. Please try again.";
  };

  const errorMessage = getErrorMessage();
  
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Header */}
      <div className="grid grid-cols-3 items-center w-full">
        <div className="col-start-2 col-end-3 text-center">
          <h1 className="text-primary">Checkout Error</h1>
        </div>
        <div className="col-start-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="text-primary h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Error Message Card */}
      <div className="w-full bg-primary-foreground p-4 rounded-3xl">
        <div className="flex flex-col text-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="icon-container bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-600">Transaction Failed</h3>
          </div>
          
          <div className="mt-2 text-primary">
            <p>{errorMessage}</p>
          </div>
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 w-full">
        <button
          onClick={onClose}
          type="button"
          className="flex flex-1 text-primary items-center justify-center border border-border-secondary rounded-lg p-2"
        >
          Cancel
        </button>
        <Button
          onClick={() => onViewChange('checkout')}
          type="button"
          className="flex flex-1 gap-1 accent-button"
        >
          <p className="flex items-center accent-text">
            Try Again <ArrowRight className="w-4 h-4 ml-1" />
          </p>
        </Button>
      </div>
    </div>
  );
};