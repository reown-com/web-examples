import "./App.css";

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import React, { useState } from "react";
import WalletActions from "./WalletActions";

const projectId = import.meta.env.VITE_PROJECT_ID as string;

// 1. Create a new EthereumProvider instance
// Based on https://github.com/wevm/wagmi/discussions/2240
// WalletConnect v2 requires explicit method registration for eth_signTypedData_v4
const provider = await EthereumProvider.init({
  projectId,
  chains: [1], // Main chain
  optionalChains: [137], // Add optional chain (Polygon) to ensure proper namespace setup
  methods: [
    "personal_sign",
    "eth_sendTransaction",
    "eth_signTransaction", // Add eth_signTransaction method
    "eth_accounts",
    "eth_signTypedData",
    "eth_signTypedData_v4", // Explicitly required for EIP-712
    "eth_signTypedData_v1",
    "personal_signTypedData",
  ],
  events: ["chainChanged", "accountsChanged"],
  showQrModal: true,
  qrModalOptions: {
    themeMode: "light",
  },
});

provider.on("display_uri", (uri) => {
  console.log("display_uri", uri);
});

// Debug: Log provider
console.log("Provider:", provider);

// 2. Pass the provider to ethers.js
const ethersWeb3Provider = new ethers.BrowserProvider(provider);

function App() {
  // 3. Handle Connect
  const connect = () => {
    provider.connect().then(() => {
      setConnected(true);
    });
  };

  const [connected, setConnected] = useState(false);

  if (connected) {
    return (
      <WalletActions
        provider={provider}
        ethersWeb3Provider={ethersWeb3Provider}
        setConnected={setConnected}
      />
    );
  }
  return <button onClick={connect}>Connect with ethereum-provider</button>;
}

export default App;
