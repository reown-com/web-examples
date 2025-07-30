import "./App.css";

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import React, { useState } from "react";
import WalletActions from "./WalletActions";

const projectId = import.meta.env.VITE_PROJECT_ID as string;

// 1. Create a new EthereumProvider instance
const provider = await EthereumProvider.init({
  projectId,
  chains: [1],
  methods: ["personal_sign", "eth_sendTransaction", "eth_accounts"],
  showQrModal: true,
  qrModalOptions: {
    themeMode: "light",
  },
});

provider.on("display_uri", (uri) => {
  console.log("display_uri", uri);
});

// 2. Pass the provider to ethers.js
const ethersWeb3Provider = new ethers.providers.Web3Provider(provider);

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
