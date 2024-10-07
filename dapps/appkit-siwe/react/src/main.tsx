import React from "react";
import ReactDOM from "react-dom/client";
import { CaipNetwork, createAppKit } from '@reown/appkit/react'
import { arbitrum, mainnet } from '@reown/appkit/networks'
import { WagmiAdapter, authConnector } from '@reown/appkit-adapter-wagmi'
import { WagmiProvider } from "wagmi";
import { walletConnect, coinbaseWallet, injected } from "wagmi/connectors";
//import type { CaipNetwork, ChainNamespace } from '@reown/appkit-common';
import type { CreateConnectorFn } from '@wagmi/core'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


import { createSIWE  } from './utils/siweUtils'

import "./styles.css"

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create metadata
const metadata = {
  name: "AppKit SIWE",
  description: "AppKit SIWE Example",
  url: "https://reown.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Set the networks
const networks: CaipNetwork[] = [mainnet, arbitrum];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
});

// 5. Create a SIWE configuration object
const siweConfig = createSIWE(networks);


// 6. Create modal
createAppKit({ 
    adapters: [wagmiAdapter], 
    networks, 
    projectId, 
    siweConfig, 
    metadata,
    features: {
      email: true, // default to true
      socials: ['google', 'x', 'github', 'discord', 'apple', 'facebook', 'farcaster'],
      emailShowWallets: true, // default to true
    } 
  });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="centered-div">
          <w3m-button />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
