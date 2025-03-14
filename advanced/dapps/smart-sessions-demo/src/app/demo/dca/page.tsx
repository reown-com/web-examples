"use client";
import React from "react";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { baseSepolia, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { DcaApplicationContextProvider } from "@/context/DcaApplicationContextProvider";
import { Toaster } from "@/components/ui/sonner";
import DCA from "@/components/DcaComponents/DCA";
import { ConstantsUtil } from "@/utils/ConstantsUtil";

const queryClient = new QueryClient();

const networks = [baseSepolia] as [AppKitNetwork, ...AppKitNetwork[]];

const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks,
  projectId: ConstantsUtil.ProjectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: baseSepolia,
  projectId: ConstantsUtil.ProjectId,
  features: {
    analytics: true,
    email: true,
    socials: [],
    emailShowWallets: false,
  },
  themeMode: "light",
  termsConditionsUrl: "https://reown.com/terms-of-service",
  privacyPolicyUrl: "https://reown.com/privacy-policy",
});

export default function DCAPage() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DcaApplicationContextProvider>
          <DCA />
          <Toaster expand={true} />
        </DcaApplicationContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
