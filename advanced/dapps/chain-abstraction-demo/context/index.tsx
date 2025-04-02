"use client";

import { wagmiAdapter, projectId, metadata, solanaAdapter } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { arbitrum, base, optimism, solanaDevnet, baseSepolia, optimismSepolia } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

if (!projectId) throw new Error("Project ID is not defined");

const modal = createAppKit({
  adapters: [solanaAdapter, wagmiAdapter],
  projectId,
  networks: [base, optimism, arbitrum, solanaDevnet, baseSepolia, optimismSepolia],
  defaultNetwork: arbitrum,
  metadata: metadata,
  features: {
    analytics: true,
  },
  universalProviderConfigOverride:{
    methods:{
      solana:[
        'solana_signMessage',
        'solana_signTransaction',
        'solana_requestAccounts',
        'solana_getAccounts',
        'solana_signAllTransactions',
        'solana_signAndSendTransaction',
        'wallet_checkout',
      ],
      eip155: [
        'eth_accounts',
        'eth_requestAccounts',
        'eth_sendRawTransaction',
        'eth_sign',
        'eth_signTransaction',
        'eth_signTypedData',
        'eth_signTypedData_v3',
        'eth_signTypedData_v4',
        'eth_sendTransaction',
        'personal_sign',
        'wallet_switchEthereumChain',
        'wallet_getPermissions',
        'wallet_requestPermissions',
        'wallet_scanQRCode',
        'wallet_getAssets',
        'wallet_checkout',
      ]
    },
  }
});

function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppKitProvider;
