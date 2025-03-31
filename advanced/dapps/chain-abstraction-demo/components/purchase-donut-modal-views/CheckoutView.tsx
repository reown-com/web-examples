"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { Loader2, X, ArrowRight } from "lucide-react";
import { useWalletCheckout } from "@/hooks/useWalletCheckout";
import { WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { walletCheckoutManager } from "@/controllers/WalletCheckoutModalManager";
import Image from "next/image";

// Checkout View
export const CheckoutView: React.FC<WalletCheckoutModalViewProps> = ({ onClose, onViewChange }) => {
  const { isWalletCheckoutSupported } = useWalletCheckout();
  const snap = useSnapshot(walletCheckoutManager.getState());
  
  const handleCheckout = async () => {
    await walletCheckoutManager.executeCheckout();
  };
  
  const { product, itemCount, isLoading } = snap.state;
  const priceValue = parseFloat(product.price.replace('$', ''));
  const totalPrice = (priceValue * itemCount).toFixed(2);
  
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Header */}
      <div className="grid grid-cols-3 items-center w-full">
        <div className="col-start-2 col-end-3 text-center">
          <h1 className="text-primary">Purchase Checkout</h1>
        </div>
        <div className="col-start-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="text-primary h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Product Card */}
      <div className="flex items-center gap-2 w-full bg-primary-foreground p-4 rounded-3xl">
        <Image 
          src="/donut.png" 
          alt={product.name} 
          width={80} 
          height={80}
          className="object-cover rounded-md"
        />
        <div className="flex flex-col gap-2 w-full h-full">
          <p className="text-primary font-bold">{product.name}</p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-secondary">Price</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs h-auto p-0 text-secondary hover:text-primary"
              >
                {product.price} each
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-primary font-bold">Quantity</p>
              <div className="flex items-center text-primary">
                <Button
                  variant="outline"
                  onClick={() => walletCheckoutManager.setItemCount(Math.max(1, itemCount - 1))}
                  className="rounded-button"
                  disabled={itemCount <= 1}
                >
                  -
                </Button>
                <div className="w-8 text-center">{itemCount}</div>
                <Button
                  variant="outline"
                  onClick={() => walletCheckoutManager.setItemCount(itemCount + 1)}
                  className="rounded-button"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Details Section */}
      <div className="flex items-center flex-col gap-2 w-full text-primary">
        <div className="flex w-full items-center gap-2">
          <div className="icon-container">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 10H21M7 15H8M12 15H13M6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5H6C4.34315 5 3 6.34315 3 8V16C3 17.6569 4.34315 19 6 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-1 items-center justify-between">
            <p>Payment Method</p>
            <div className="flex gap-4 items-center justify-between">
              <div className="payment-option-badge">
                <p>Credit Card</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Section */}
      <div className="flex justify-between w-full items-center mt-2">
        <p className="text-secondary">Total</p>
        <p className="text-md font-bold text-primary">
          ${totalPrice}
        </p>
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
          onClick={handleCheckout}
          type="button"
          className="flex flex-1 gap-1 accent-button"
          disabled={isLoading || !isWalletCheckoutSupported}
        >
          <p className="flex items-center accent-text">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Processing...
              </>
            ) : (
              <>
                Complete Payment <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </p>
        </Button>
      </div>
    </div>
  );
};