"use client";

import React, { ReactNode } from "react";
import { config, projectId, metadata } from "@/config";

import { createWeb3Modal } from "@web3modal/wagmi/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { State, WagmiProvider } from "wagmi";

// Setup queryClient
const queryClient = new QueryClient();

if (!projectId) throw new Error("Project ID is not defined");

// Create modal
createWeb3Modal({
  metadata,
  wagmiConfig: config,
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
  enableOnramp: true, // Optional - false as default
  themeMode: "light", // By default - set to user system settings
  themeVariables: {
    "--w3m-font-family": "Verdana", // Base font family
    // "--w3m-color-mix": "#0137b6", // The color that blends in with the default colors
    // "--w3m-color-mix-strength": 60, // The percentage on how much "--w3m-color-mix" should blend in
    // "--w3m-accent": "#feea35", // Color used for buttons, icons, labels, etc.
    // "--w3m-font-size-master": "10px",
    "--w3m-border-radius-master": "2px",
    "--w3m-z-index": 1
  }
});

export default function Web3ModalProvider({ children, initialState }: { children: ReactNode; initialState?: State }) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
