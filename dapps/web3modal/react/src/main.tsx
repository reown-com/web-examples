import React from "react";
import ReactDOM from "react-dom/client";
import { createWeb3Modal } from "@web3modal/wagmi/react";

import { http, createConfig, WagmiProvider } from "wagmi";
import { walletConnect, coinbaseWallet, injected } from "wagmi/connectors";
import type { CreateConnectorFn } from '@wagmi/core'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authConnector } from "@web3modal/wagmi";

import "./styles.css"

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create wagmiConfig
const metadata = {
  name: "AppKit",
  description: "AppKit Example",
  url: "https://example.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const botanixTestnet = {
  id: 3636,
  name: "Botanix Testnet",
  chainId: 3636,
  nativeCurrency: {
    name: "Botanix",
    symbol: "BTC",
    decimals: 18,
  },
  blockExplorer: "https://blockscout.botanixlabs.dev/",
  rpcUrls: {
    default: {
      http: ["https://poa-node.botanixlabs.dev"],
    }
  },
  testnet: true,
};
const chains = [botanixTestnet] as const;

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

const wagmiConfig = createConfig({
  chains, // Use the defined chains here
  transports: {
    [botanixTestnet.id]: http(),
  },
  connectors: connectors,
});

// 3. Create modal
createWeb3Modal({ wagmiConfig, projectId });

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