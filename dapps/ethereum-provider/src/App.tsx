import "./App.css";

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import React, { useState } from "react";

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
  const [balance, setBalance] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);

  // 4. Fetch Balance on click with ethers.js
  const getBalance = async () => {
    const balanceFromEthers = await ethersWeb3Provider
      .getSigner(provider.accounts[0])
      .getBalance();
    const remainder = balanceFromEthers.mod(1e14);
    setBalance(ethers.utils.formatEther(balanceFromEthers.sub(remainder)));
  };

  // 5. Get accounts using eth_accounts method
  const getAccounts = async () => {
    try {
      const accountsResult = await provider.request({
        method: "eth_accounts",
        params: [],
      });
      setAccounts(accountsResult as string[]);
      console.log("Accounts:", accountsResult);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  // 6. Handle Disconnect
  const refresh = () => {
    provider.disconnect();
    window.localStorage.clear();
    setConnected(false);
    setAccounts([]);
    setBalance(null);
  };

  if (connected) {
    return (
      <>
        <button onClick={getBalance}>Balance</button>
        <button onClick={getAccounts}>Get Accounts</button>
        <button onClick={refresh}>Refresh</button>
        <p>
          balance: {balance ? `${balance} ETH` : `click "Balance" to fetch`}
        </p>
        <p>
          accounts:{" "}
          {accounts.length > 0
            ? accounts.join(", ")
            : `click "Get Accounts" to fetch`}
        </p>
      </>
    );
  }
  return <button onClick={connect}>Connect with ethereum-provider</button>;
}

export default App;
