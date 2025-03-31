"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { walletCheckoutManager, WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";

// Error View
export const ErrorView: React.FC<WalletCheckoutModalViewProps> = ({ onClose, onViewChange }) => {
  const snap = useSnapshot(walletCheckoutManager.getState());
  const { error } = snap.state;
  
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Header */}
      <div className="grid grid-cols-3 items-center w-full">
        <div className="col-start-2 col-end-3 text-center">
          <h1 className="text-primary">Transaction Error</h1>
        </div>
        <div className="col-start-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="text-primary h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Error Message Card */}
      <div className="w-full bg-primary-foreground p-4 rounded-3xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="icon-container bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-600">Transaction Failed</h3>
          </div>
          
          <div className="mt-2 text-primary">
            <p>{error?.message || "An unknown error occurred"}</p>
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