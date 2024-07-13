import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { signMessage,signTransacion, sendTransaction, TronChains } from "./utils/helpers";

const projectId = import.meta.env.VITE_PROJECT_ID;

const events: string[] = [];

// 1. select chains (tron)
const chains = [`tron:${TronChains.Mainnet}`];

// 2. select methods (tron)
const methods = ["tron_signMessage", "tron_signTransaction", "eth_sendTransaction"];

// 3. create modal instance
const modal = new WalletConnectModal({
  projectId,
  chains,
});

// 4. create provider instance
const provider = await UniversalProvider.init({
  logger: "error",
  projectId: projectId,
  metadata: {
    name: "WalletConnect x Tron",
    description: "Tron integration with WalletConnect's Universal Provider",
    url: "https://walletconnect.com/",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  },
});

const App = () => {
  const [isConnected, setIsConnected] = useState(false);

  // 5. get address once loaded
  const address =
    provider.session?.namespaces.tron?.accounts[0].split(":")[2];

  // 6. handle display_uri event and open modal
  provider.on("display_uri", async (uri: string) => {
    console.log("uri", uri);
    await modal.openModal({
      uri,
    });
  });

  // 7. handle connect event
  const connect = async () => {
    try {
      await provider.connect({
        namespaces: {
          tron: {
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

  // 8. handle disconnect event
  const disconnect = async () => {
    await provider.disconnect();
    setIsConnected(false);
  };

  // 9. handle signMessage and sendTransaction
  const handleSign = async () => {
    console.log("signing");
    const res = await signMessage(
      `Can i have authorize this request pls bossman - ${Date.now()}`,
      provider,
      address!
    );
    console.log("-",res);
  };


  const handleSendTransaction = async () => {
    const res = await signTransacion(address!, provider, address!);
    console.log(res);
  };

  return (
    <div className="App">
      {isConnected ? (
        <>
          <p>
            <b>Address: </b>
            {address}
          </p>
          <div className="btn-container">
            <button onClick={handleSign}>Sign MSG</button>
            <button onClick={handleSendTransaction}>Send Transaction</button>
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
