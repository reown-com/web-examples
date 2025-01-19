import React from "react";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { base, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { ConstantsUtil } from "@/utils/ConstantsUtil";

const queryClient = new QueryClient();

const networks = [base] as [AppKitNetwork, ...AppKitNetwork[]];

const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks,
  projectId: ConstantsUtil.ProjectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: base,
  projectId: ConstantsUtil.ProjectId,
  features: {
    email: true, 
    socials: [],
    emailShowWallets: false, 
    analytics: true,
  },
  allWallets: 'HIDE', 
  themeMode: "dark",
  termsConditionsUrl: "https://reown.com/terms-of-service",
  privacyPolicyUrl: "https://reown.com/privacy-policy",
});

import { ReactNode } from "react";
import { ChatProvider } from "@/context/ChatContext";

export default function AppkitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChatProvider>
          {children}
        </ChatProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
