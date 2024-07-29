import React from "react";
import ReactDOM from "react-dom/client";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { WagmiProvider } from "wagmi";
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import {optimismSepolia, mainnet, polygon, type Chain } from "viem/chains";
import { walletConnect, coinbaseWallet, injected } from "wagmi/connectors";
import type { CreateConnectorFn } from '@wagmi/core'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authConnector  } from "@web3modal/wagmi";

import { createSIWE  } from './utils/siweUtils'

import "./styles.css"

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create wagmiConfig
const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Define chains
const chains = [optimismSepolia, mainnet, polygon] as [Chain, ...Chain[]]

// create the connectors
const connectors: CreateConnectorFn[] = []
connectors.push(walletConnect({ projectId, metadata, showQrModal: false }));
connectors.push(injected({ shimDisconnect: true }));
connectors.push(coinbaseWallet({
  appName: metadata.name,
  appLogoUrl: metadata.icons[0],
}));

connectors.push(authConnector({ 
  options: { projectId },
  socials: ['google', 'x', 'github', 'discord', 'apple'], // this will create a non-custodial wallet (please check https://secure.walletconnect.com/dashboard for more info)
  showWallets: true,
  email: true,
  walletFeatures: false,
}));

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
});

// 3. Create a SIWE configuration object
const siweConfig = createSIWE(chains.map(chain => chain.id) as [number]);


// 4. Create modal
createWeb3Modal({ wagmiConfig, projectId, siweConfig });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="centered-div">
          <w3m-button />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
