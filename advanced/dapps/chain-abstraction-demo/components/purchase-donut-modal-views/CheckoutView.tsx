"use client";

import React from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/button";
import { Loader2, X, ArrowRight, Wallet2 } from "lucide-react";
import { useWalletCheckout } from "@/hooks/useWalletCheckout";
import { WalletCheckoutModalViewProps } from "@/controllers/WalletCheckoutModalManager";
import { walletCheckoutManager } from "@/controllers/WalletCheckoutModalManager";
import Image from "next/image";
import { PaymentOptions } from "@/components/purchase-donut-modal-views/PaymentOptions";

export const CheckoutView: React.FC<WalletCheckoutModalViewProps> = ({ onClose, onViewChange }) => {
  const { isWalletCheckoutSupported } = useWalletCheckout();
  const snap = useSnapshot(walletCheckoutManager.getState());
  
  const handleCheckout = async () => {
    await walletCheckoutManager.executeCheckout();
  };
  
  const { product, itemCount, isLoading, paymentOptions } = snap.state;
  const priceValue = parseFloat(product.price.replace('$', ''));
  const totalPrice = (priceValue * itemCount).toFixed(2);
  
  const hasSelectedPaymentOptions = paymentOptions.length > 0;
  
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Header */}
      <div className="grid grid-cols-3 items-center w-full">
        <div className="col-start-2 col-end-3 text-center">
          <h1 className="text-primary">Checkout</h1>
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
                <div className="w-8 text-center">{itemCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Details Section with PaymentOptions component */}
      <div className="flex items-center flex-col gap-2 w-full text-primary">
        <div className="flex w-full items-center gap-2">
          <div className="icon-container">
            <Wallet2 className="w-4 h-4" />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <p>Payment Options</p>
            <div className="flex gap-4 items-center justify-between">
              <PaymentOptions />
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
          disabled={isLoading || !isWalletCheckoutSupported || !hasSelectedPaymentOptions}
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