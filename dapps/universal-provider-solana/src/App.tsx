import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { useState, useEffect } from "react";
import { signMessage, sendTransaction, SolanaChains } from "./utils/helpers";

const projectId = import.meta.env.VITE_PROJECT_ID;

const events: string[] = [];

// 1. select chains (solana)
const chains = [`solana:${SolanaChains.MainnetBeta}`];

// 2. select methods (solana)
const methods = ["solana_signMessage", "solana_signTransaction"];

// 3. create modal instance
const modal = new WalletConnectModal({
  projectId,
  chains,
});

// 4. create provider instance
const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<UniversalProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const initProvider = async () => {
      const newProvider = await UniversalProvider.init({
        logger: "error",
        projectId: projectId,
        metadata: {
          name: "WalletConnect x Solana",
          description: "Solana integration with WalletConnect's Universal Provider",
          url: "https://walletconnect.com/",
          icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
      });

      setProvider(newProvider);

      // Set up event listener
      newProvider.on("display_uri", async (uri: string) => {
        console.log("uri", uri);
        await modal.openModal({ uri });
      });
    };

    initProvider();
  }, []);

  useEffect(() => {
    if (provider && provider.session) {
      const newAddress = provider.session?.namespaces.solana?.accounts[0].split(":")[2];
      setAddress(newAddress);
    }
  }, [provider, provider?.session]);

  // 7. handle connect event
  const connect = async () => {
    if (!provider) return;
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
      console.log("::::::: session", provider.session);
    } catch {
      console.log("####### Something went wrong, request cancelled");
    }
    modal.closeModal();
  };

  // 8. handle disconnect event
  const disconnect = async () => {
    if (!provider) return;
    await provider.disconnect();
    setIsConnected(false);
  };

  // 9. handle signMessage and sendTransaction
  const handleSign = async () => {
    if (!provider || !address) return;
    const res = await signMessage(
      `Can i have authorize this request pls bossman - ${Date.now()}`,
      provider,
      address
    );
    console.log(res);
  };

  const handleSend = async () => {
    if (!provider || !address) return;
    const res = await sendTransaction(address, 1000, provider, address);
    console.log(res);
  };

  return (
    <div className="App">
      {isConnected ? (
        <>
          <p>
            <b>Public Key: </b>
            {address}
          </p>
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
