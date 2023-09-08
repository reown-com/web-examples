import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { signMessage, sendTransaction, SolanaChains } from "./utils/helpers";

const projectId = import.meta.env.VITE_PROJECT_ID;

const events: string[] = [];

const chains = [
  `solana:${SolanaChains.MainnetBeta}`,
  // `solana:${SolanaChains.Devnet}`,
];

const methods = ["solana_signMessage", "solana_signTransaction"];

const modal = new WalletConnectModal({
  projectId,
  chains,
});

const provider = await UniversalProvider.init({
  logger: "info",
  projectId: projectId,
  metadata: {
    name: "WalletConnect x Solana",
    description: "Solana integration with WalletConnect's Universal Provider",
    url: "https://walletconnect.com/",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  },
});

const App = () => {
  const [isConnected, setIsConnected] = useState(false);

  const address = provider.session?.namespaces.solana.accounts[0].split(":")[2];

  provider.on("display_uri", async (uri: string) => {
    console.log('uri', uri)
    await modal.openModal({
      uri,
    });
  });

  const connect = async () => {
    try {
      await provider.connect({
        namespaces: {
          solana: {
            methods,
            chains,
            events,
          },
        },
      });
      setIsConnected(true);
      console.log("session", provider.session);
    } catch {
      console.log("Something went wrong, request cancelled");
    }
    modal.closeModal();
  };

  const disconnect = async () => {
    await provider.disconnect();
    setIsConnected(false);
  };

  const handleSign = async () => {
    const res = await signMessage(
      `Can i have authorize this request pls bossman - ${Date.now()}`,
      provider,
      address!
    );
    console.log(res);
  };

  const handleSend = async () => {
    const res = await sendTransaction(address!, 1000, provider, address!);
    console.log(res);
  };

  return (
    <div className="App">
      {isConnected ? (
        <>
          <p><b>Public Key: </b>{address}</p>
          <div className="btn-container">
            <button onClick={handleSign}>Sign</button>
            <button onClick={handleSend}>Send</button>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        </>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
};

export default App;
