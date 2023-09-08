import "./App.css";

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import typedData from "./static/typedData";

const provider = await EthereumProvider.init({
  projectId: "3f930f8e56336b44761655d8a270144c",
  chains: [1],
  methods: ["eth_signTypedData", "eth_signTypedData_v4"],
  showQrModal: true,
  qrModalOptions: {
    themeMode: "light",
  },
});

provider.on("display_uri", (uri) => {
  console.log("display_uri", uri);
});

const ethersWeb3Provider = new ethers.providers.Web3Provider(provider);

console.log(ethersWeb3Provider);

function App() {
  const connect = () => {
    provider.connect().then(() => {
      setConnected(true);
    });
  };

  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  const getBalance = async () => {
    const balanceFromEthers = await ethersWeb3Provider
      .getSigner(provider.accounts[0])
      .getBalance();
    const remainder = balanceFromEthers.mod(1e14);
    setBalance(ethers.utils.formatEther(balanceFromEthers.sub(remainder)));
  };

  const callEthSign = async () => {
    const signerAddress = provider.accounts[0];
    const response = await provider.signer.request({
      method: "eth_signTypedData",
      params: [signerAddress, JSON.stringify(typedData)],
    });
    console.log("Signature(eth_signTypedData):", response);
  };

  const refresh = () => {
    provider.disconnect();
    window.localStorage.clear();
    setConnected(false);
  };

  useEffect(() => {
    provider.on("accountsChanged", (data) => {
      console.log(data);
      setConnected(false);
    });
    getBalance();
  }, []);

  if (connected) {
    return (
      <>
        <button onClick={getBalance}>Balance</button>
        <button onClick={callEthSign}>Sign</button>
        <button onClick={refresh}>Refresh</button>
        <p>balance: {balance} ETH</p>
      </>
    );
  }
  return <button onClick={connect}>Connect with ethereum-provider</button>;
}

export default App;
