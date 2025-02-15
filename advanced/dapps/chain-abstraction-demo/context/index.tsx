"use client";

import { wagmiAdapter, projectId, metadata } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { arbitrum, base, optimism } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

if (!projectId) throw new Error("Project ID is not defined");

const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base, optimism, arbitrum],
  defaultNetwork: arbitrum,
  metadata: metadata,
  features: {
    analytics: true,
  },
});

function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppKitProvider;
