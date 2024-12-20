"use client";

import {
  Network,
  supportedNetworks,
  supportedTokens,
  Token,
} from "@/data/EIP155Data";
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
        donutCount: 1,
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
    this.state.state.token = token;
  }

  setNetwork(network: Network): void {
    this.state.state.network = network;
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
}

// Singleton instance
export const giftDonutModalManager = new GiftDonutModalManager();
