import React, { ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { base, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { ConstantsUtil } from "@/utils/ConstantsUtil";
import { ChatProvider } from "@/context/ChatContext";
import { ThemeProvider } from "./theme-provider";

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



export default function AppkitProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
        
            <ChatProvider>
              {children}
            </ChatProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
