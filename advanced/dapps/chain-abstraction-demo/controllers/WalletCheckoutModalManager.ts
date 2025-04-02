"use client";

import { proxy } from "valtio";
import { PaymentOption, CheckoutRequest, CheckoutResult } from "@/types/wallet_checkout";
import UniversalProvider from '@walletconnect/universal-provider';
import React from "react";
import { SupportedAsset, supportChains } from "@/data/CheckoutPaymentAssets";

// Type definitions
export type WalletCheckoutModalView = {
  component: React.FC<WalletCheckoutModalViewProps>;
  title?: string;
};

export type WalletCheckoutModalViewProps = {
  onClose: () => void;
  onViewChange: (viewKey: string) => void;
};

export type AssetSelectionResult = {
  selectedAssetIds: string[];
};

export type PaymentOptionsModalData = {
  availableAssets: SupportedAsset[];
  selectedAssets: SupportedAsset[];
  onAssetToggled?: (result: AssetSelectionResult) => void;
  previousView?: string;
};

export type WalletCheckoutState = {
  orderId?: string;
  product: {
    name: string;
    description: string;
    imageUrl: string;
    price: string;
  };
  itemCount: number;
  paymentOptions: PaymentOption[];
  allPaymentOptions: PaymentOption[];   
  availableAssets: SupportedAsset[];  
  paymentOptionsModalData?: PaymentOptionsModalData;
  supportChains: typeof supportChains;
  checkoutResult?: CheckoutResult;
  isLoading: boolean;
  error?: Error | unknown;
};

export type WalletCheckoutModalStateType = {
  isOpen: boolean;
  currentView: string;
  views: Record<string, WalletCheckoutModalView>;
  state: WalletCheckoutState;
};

class WalletCheckoutModalManager {
  private state: WalletCheckoutModalStateType;
  private subscribers: Array<(state: WalletCheckoutModalStateType) => void> = [];
  private debounceTimeout: NodeJS.Timeout | null = null;
  private walletProvider?: UniversalProvider;

  constructor() {
    this.state = proxy<WalletCheckoutModalStateType>({
      isOpen: false,
      currentView: "",
      views: {},
      state: {
        itemCount: 1,
        product: {
          name: 'Chocolate sprinkle Delight',
          description: 'Donut with extra chocolate sprinkles on top',
          imageUrl: 'https://ca-demo.reown.com/donut.png',
          price: '$1.00'
        },
        paymentOptions: [],
        allPaymentOptions: [],  
        availableAssets: [],    
        supportChains: supportChains,
        isLoading: false
      },
    });
  }

  getState(): WalletCheckoutModalStateType {
    return this.state;
  }

  setWalletProvider(provider: UniversalProvider): void {
    this.walletProvider = provider;
  }

  getWalletProvider(): UniversalProvider | undefined {
    return this.walletProvider;
  }

  open(viewKey?: string): void {
    const fallbackView = Object.keys(this.state.views)[0];
    const targetView = viewKey || fallbackView;

    if (!this.state.views[targetView]) {
      console.error(
        `View ${targetView} not found. Available views:`,
        Object.keys(this.state.views),
      );
      return;
    }
    this.state.isOpen = true;
    this.state.currentView = targetView;
    this.notifySubscribers();
  }

  close(): void {
    this.state.isOpen = false;
    this.state.currentView = "";
    this.resetTransactionState();
    this.notifySubscribers();
  }

  switchView(viewKey: string): void {
    if (this.state.views[viewKey]) {
      this.state.currentView = viewKey;
      this.notifySubscribers();
    } else {
      console.warn(`Attempted to switch to an unknown view: ${viewKey}`);
    }
  }

  registerView(key: string, view: WalletCheckoutModalView): void {
    if (this.state.views[key]) {
      console.warn(`A view with key "${key}" is already registered.`);
      return;
    }
    this.state.views[key] = view;
    this.notifySubscribers();
  }

  unregisterView(key: string): void {
    if (!this.state.views[key]) {
      console.warn(`No view found with key "${key}" to unregister.`);
      return;
    }
    delete this.state.views[key];
    this.notifySubscribers();
  }

  setItemCount(count: number): void {
    this.state.state.itemCount = count;
    this.notifySubscribers();
  }

  getItemCount(): number {
    return this.state.state.itemCount;
  }

  setPaymentOptions(options: PaymentOption[]): void {
    this.state.state.paymentOptions = options;
    this.notifySubscribers();
  }

  getPaymentOptions(): PaymentOption[] {
    return this.state.state.paymentOptions;
  }

  // New method to store all available payment options
  setAllPaymentOptions(options: PaymentOption[]): void {
    this.state.state.allPaymentOptions = options;
    this.notifySubscribers();
  }

  getAllPaymentOptions(): PaymentOption[] {
    return this.state.state.allPaymentOptions;
  }

  setAvailableAssets(assets: SupportedAsset[]): void {
    this.state.state.availableAssets = assets;
    this.notifySubscribers();
  }

  getAvailableAssets(): SupportedAsset[] {
    return this.state.state.availableAssets;
  }

  setPaymentOptionsModalData(data: PaymentOptionsModalData): void {
    this.state.state.paymentOptionsModalData = data;
    this.notifySubscribers();
  }

  setSelectedPaymentAssets(assetIds: string[]): void {
    const selectedOptions = this.state.state.allPaymentOptions.filter(option => 
      assetIds.includes(option.asset)
    );
    
    if (selectedOptions.length > 0) {
      this.setPaymentOptions(selectedOptions);
    }
    
    this.notifySubscribers();
  }

  // Method to get the selected payment assets
  getSelectedPaymentAssets(): string[] {
    return this.state.state.paymentOptions.map(option => option.asset);
  }

  getAdjustedPaymentOptions(): PaymentOption[] {
    const { itemCount, paymentOptions } = this.state.state;
    
    // Return all options with adjusted amounts
    return paymentOptions.map(payment => {
      // Skip if amount is not present
      if (!payment.amount) {
        return payment;
      }

      // Parse hex amount and multiply by item count
      const originalAmount = parseInt(payment.amount, 16);
      const newAmount = (originalAmount * itemCount).toString(16);

      return {
        ...payment,
        amount: `0x${newAmount}`
      };
    });
  }

  setLoading(isLoading: boolean): void {
    this.state.state.isLoading = isLoading;
    this.notifySubscribers();
  }

  isLoading(): boolean {
    return this.state.state.isLoading;
  }

  setError(error?: Error | unknown): void {
    this.state.state.error = error;
    this.notifySubscribers();
  }

  getError(): Error | unknown {
    return this.state.state.error;
  }

  setCheckoutResult(result: CheckoutResult): void {
    this.state.state.checkoutResult = result;
    // When we get a result, automatically switch to receipt view
    this.switchView('receipt');
    this.notifySubscribers();
  }

  getCheckoutResult(): CheckoutResult | undefined {
    return this.state.state.checkoutResult;
  }

  // Prepares a new checkout request
  prepareCheckoutRequest(): CheckoutRequest {
    const orderId = crypto.randomUUID();
    this.state.state.orderId = orderId;
    
    const expiry = Math.floor(Date.now() / 1000) + 60 * 30; // 30 min expiry
    
    return {
      orderId,
      acceptedPayments: this.getAdjustedPaymentOptions(),
      products: [this.state.state.product],
      expiry
    };
  }

  // Execute the wallet checkout
  async executeCheckout(walletProvider?: UniversalProvider): Promise<void> {
    const provider = walletProvider || this.walletProvider;
    
    if (!provider) {
      this.setError(new Error('No supported wallet provider available'));
      if (this.state.views['error']) {
        this.switchView('error');
      }
      return;
    }
    
    this.setLoading(true);
    this.setError(undefined);
    
    try {
      const checkoutRequest = this.prepareCheckoutRequest();
      
      const result = await provider.request({
        method: 'wallet_checkout',
        params: [checkoutRequest]
      });
      
      this.setCheckoutResult(result as CheckoutResult);
    } catch (err) {
      console.error('Checkout failed:', err);
      
      this.setError(err);
      
      if (this.state.views['error']) {
        this.switchView('error');
      }
    } finally {
      this.setLoading(false);
    }
  }

  resetTransactionState(): void {
    this.state.state.orderId = undefined;
    this.state.state.checkoutResult = undefined;
    this.state.state.error = undefined;
    this.state.state.isLoading = false;
    // Don't reset paymentOptions to maintain user preference
    this.notifySubscribers();
  }
  
  // Add subscription functionality for components to react to state changes
  subscribe(callback: (state: WalletCheckoutModalStateType) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }
  
  // Update the notifySubscribers method to use debouncing
  private notifySubscribers(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      for (const callback of this.subscribers) {
        callback(this.state);
      }
      this.debounceTimeout = null;
    }, 50); 
  }
}

export const walletCheckoutManager = new WalletCheckoutModalManager();