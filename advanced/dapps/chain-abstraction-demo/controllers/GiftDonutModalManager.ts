"use client";

import {
  Network,
  supportedNetworks,
  supportedTokens,
  Token,
  isTokenSupportedOnNetwork,
} from "@/data/EIP155Data";
import { TokenBalance } from "@/utils/BalanceFetcherUtil";
import React from "react";
import { proxy } from "valtio";

// Improved type definitions (expanded)
export type GiftDonutModalView = {
  component: React.FC<GiftDonutModalViewProps>;
  title?: string;
};

export type GiftDonutModalViewProps = {
  onClose: () => void;
  onViewChange: (viewKey: string) => void;
};

export type GiftDonutState = {
  donutCount: number;
  network?: Network;
  token: Token;
  recipient?: string;
  balances: TokenBalance[];
  tokenNetworkCompatible: boolean;
};

export type GiftDonutModalStateType = {
  isOpen: boolean;
  currentView: string;
  views: Record<string, GiftDonutModalView>;
  state: GiftDonutState;
};

class GiftDonutModalManager {
  private state: GiftDonutModalStateType;

  constructor() {
    this.state = proxy<GiftDonutModalStateType>({
      isOpen: false,
      currentView: "",
      views: {},
      state: {
        token: supportedTokens[0],
        donutCount: 0,
        balances: [],
        tokenNetworkCompatible: true,
      },
    });
  }

  getState(): GiftDonutModalStateType {
    return this.state;
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
  }

  close(): void {
    this.state.isOpen = false;
    this.state.currentView = "";
  }

  switchView(viewKey: string): void {
    if (this.state.views[viewKey]) {
      this.state.currentView = viewKey;
    } else {
      console.warn(`Attempted to switch to an unknown view: ${viewKey}`);
    }
  }

  registerView(key: string, view: GiftDonutModalView): void {
    if (this.state.views[key]) {
      console.warn(`A view with key "${key}" is already registered.`);
      return; // Prevent overwriting existing views
    }
    this.state.views[key] = view;
  }

  unregisterView(key: string): void {
    if (!this.state.views[key]) {
      console.warn(`No view found with key "${key}" to unregister.`);
      return;
    }
    delete this.state.views[key];
  }

  setToken(token: Token): void {
    this.state.state.donutCount = 0; // Reset donut count when changing token
    this.state.state.token = token;
    
    // Check compatibility with current network
    if (this.state.state.network) {
      this.checkTokenNetworkCompatibility();
    }
  }

  setNetwork(network: Network): void {
    this.state.state.network = network;
    
    // Check compatibility with current token
    this.checkTokenNetworkCompatibility();
  }

  checkTokenNetworkCompatibility(): void {
    const { token, network } = this.state.state;
    if (!network) {
      // No network selected yet, so we can't check compatibility
      this.state.state.tokenNetworkCompatible = false;
      return;
    }
    
    this.state.state.tokenNetworkCompatible = isTokenSupportedOnNetwork(token, network.chainId);
  }

  isTokenNetworkCompatible(): boolean {
    return this.state.state.tokenNetworkCompatible;
  }

  setRecipient(recipientAddress: string): void {
    this.state.state.recipient = recipientAddress;
  }

  getToken(): Token {
    return this.state.state.token;
  }

  getNetwork(): Network | undefined {
    return this.state.state.network;
  }

  getRecipient(): string | undefined {
    return this.state.state.recipient;
  }

  setDonutCount(count: number): void {
    this.state.state.donutCount = count;
  }

  getDonutCount(): number {
    return this.state.state.donutCount;
  }

  setBalances(balances: TokenBalance[]): void {
    this.state.state.balances = balances;
  }

  getBalances(): TokenBalance[] {
    return this.state.state.balances;
  }

  getBalanceBySymbol(symbol: string): string {
    const balance = this.state.state.balances.find((b) => b.symbol === symbol);
    return balance?.balance || "0.00";
  }

  getBalanceByAddress(address: `0x${string}`): string {
    const balance = this.state.state.balances.find(
      (b) => b.address === address,
    );
    return balance?.balance || "0.00";
  }
}

// Singleton instance
export const giftDonutModalManager = new GiftDonutModalManager();
