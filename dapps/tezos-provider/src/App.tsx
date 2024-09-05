import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { SAMPLES, SAMPLE_KINDS } from "./utils/samples";
import TezosProvider, { formatTezosBalance, getChainId, TezosChainDataMainnet, TezosChainDataTestnet } from "./utils/tezos-provider";

const projectId = import.meta.env.VITE_PROJECT_ID;

// 1. create modal instance
const modal = new WalletConnectModal({
  projectId
});

// 2. create provider instance
const provider: TezosProvider = await TezosProvider.init({
  logger: "debug",
  projectId: projectId,
  metadata: {
    name: "WalletConnect @ Tezos",
    description: "Tezos integration with WalletConnect's Tezos Provider",
    url: "https://walletconnect.com/",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  },
});

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastKind, setLastKind] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [description, setDescription] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [balance, setBalance] = useState("");

  // 3. handle display_uri event and open modal
  const subscribe = async () => {
    if (provider.signer) {
      console.log("Subscribing to events...");
      provider.signer.on("display_uri", async (uri: string) => {
        console.log("event display_uri", uri);
        await modal.openModal({
          uri,
        });
      });

      provider.signer.on("session_ping", ({ id, topic }: { id: string; topic: string }) => {
        console.log("Event session_ping:", id, topic);
      });

      provider.signer.on("session_event", ({ event, chainId }: { event: any; chainId: string }) => {
        console.log("Event session_event:", event, chainId);
      });

      provider.signer.on("session_update", ({ topic, params }: { topic: string; params: any }) => {
        console.log("Event session_update:", topic, params);
      });

      provider.signer.on("session_delete", ({ id, topic }: { id: string; topic: string }) => {
        console.log("Event session_delete:", id, topic);
      });

      provider.signer.on("connect", ({ id, topic }: { id: string; topic: string }) => {
        console.log("Event connect:", id, topic);
      });

      provider.signer.on("disconnect", ({ id, topic }: { id: string; topic: string }) => {
        console.log("Event disconnect:", id, topic);
        setIsConnected(false);
      });
    }
  };

  const getBalance = async () => {
    if (provider) {
      const balance = await provider.getBalance();
      setBalance(formatTezosBalance(balance));
    }
  };

  // 4. handle connect event
  const connect = async () => {
    window.localStorage.removeItem('walletconnect');
    console.log("Connecting...");
    try {
      await subscribe();
      await provider.connect({chains: [TezosChainDataTestnet, TezosChainDataMainnet]});
      setIsConnected(true);
      console.log("Connected successfully. Provider", provider);
      const chainId = await getChainId("tezos:testnet");
      console.log("Connected to chain:", chainId);
      await getBalance();
    } catch (error) {
      console.error("Connection error:", error);
    }
    modal.closeModal();
  };

  // 5. handle disconnect event
  const disconnect = async () => {
    console.log("Disconnecting...");
    if (provider.signer) {
      await provider.signer.disconnect();
    }
    window.localStorage.removeItem('walletconnect');
    setIsConnected(false);
    setResult(null); // Clear result on disconnect
  };

  // 6. handle operations
  const handleOp = async (kind: SAMPLE_KINDS) => {
    if (!provider) return;

    setLastKind(kind);
    setResult("Waiting for response from the Wallet...");

    try {
      let res = null;
      switch (kind) {
        case SAMPLE_KINDS.GET_ACCOUNTS:
          res = await provider.tezosGetAccounts();
          break;
        case SAMPLE_KINDS.SIGN:
          res = await provider.tezosSign("05010000004254");
          break;
        case SAMPLE_KINDS.SEND_TRANSACTION:
          res = await provider.tezosSendTransaction(SAMPLES[SAMPLE_KINDS.SEND_TRANSACTION]);
          break;
        case SAMPLE_KINDS.SEND_DELEGATION:
          res = await provider.tezosSendDelegation(SAMPLES[SAMPLE_KINDS.SEND_DELEGATION]);
          break;
        case SAMPLE_KINDS.SEND_UNDELEGATION:
          res = await provider.tezosSendUndelegation();
          break;
        case SAMPLE_KINDS.SEND_ORGINATION:
          res = await provider.tezosSendOrigination(SAMPLES[SAMPLE_KINDS.SEND_ORGINATION]);
          const contractAddressList = await provider.getContractAddress(res.hash);
          if (contractAddressList.length > 0) {
            setContractAddress(contractAddressList[0]);
            console.log("TezosRpc stored contract:", contractAddressList[0]);
          } else {
            console.error("TezosRpc could not find contract address in origination operation.");
          }
          break;
        case SAMPLE_KINDS.SEND_CONTRACT_CALL:
          res = await provider.tezosSendContractCall({
            ...SAMPLES[SAMPLE_KINDS.SEND_CONTRACT_CALL],
            destination: contractAddress,
          });
          break;
        case SAMPLE_KINDS.SEND_STAKE:
          res = await provider.tezosSendStake(SAMPLES[SAMPLE_KINDS.SEND_STAKE]);
          break;
        case SAMPLE_KINDS.SEND_UNSTAKE:
          res = await provider.tezosSendUnstake(SAMPLES[SAMPLE_KINDS.SEND_UNSTAKE]);
          break;
        case SAMPLE_KINDS.SEND_FINALIZE:
          res = await provider.tezosSendFinalizeUnstake(SAMPLES[SAMPLE_KINDS.SEND_FINALIZE]);
          break;
        case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
          res = await provider.tezosSendIncreasePaidStorage({
            ...SAMPLES[SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE],
            destination: contractAddress,
          });
          break;
            
        default:
          throw new Error(`App: Unsupported kind ${kind}`);
      }
      setLastKind(kind);
      setResult(res);
      await getBalance();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error sending ${kind}:`, error.name, error.message);
        setResult([error.name, error.message]);
      } else {
        console.error(`Error sending ${kind}:`, error);
        setResult(error);
      }
    }
  };

  const describe = (kind: SAMPLE_KINDS) => {
    switch (kind) {
      case SAMPLE_KINDS.SEND_TRANSACTION:
        setDescription(SAMPLES[kind]);
        break;
      case SAMPLE_KINDS.SEND_DELEGATION:
        setDescription(SAMPLES[kind]);
        break;
      case SAMPLE_KINDS.SEND_UNDELEGATION:
        setDescription(SAMPLES[kind]);
        break;
      case SAMPLE_KINDS.SEND_ORGINATION:
        setDescription(SAMPLES[kind]);
        break;
      case SAMPLE_KINDS.SEND_CONTRACT_CALL:
        setDescription({
          ...SAMPLES[kind],
          destination: contractAddress ? contractAddress : "[click Origination to get contract address]",
        });
        break;
      case SAMPLE_KINDS.SEND_STAKE:
        setDescription({...SAMPLES[kind], destination: provider.address});
        break;
      case SAMPLE_KINDS.SEND_UNSTAKE:
        setDescription({...SAMPLES[kind], destination: provider.address});
        break;
      case SAMPLE_KINDS.SEND_FINALIZE:
        setDescription({...SAMPLES[kind], destination: provider.address});
        break;
      case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
        setDescription({
          ...SAMPLES[kind],
          destination: contractAddress ? contractAddress : "[click Origination to get contract address]",
        });
        break;
      default:
        setDescription("No description available");
    }
  };

  const describeClear = () => {
    setDescription(undefined);
  };

  return (
    <div className="App">
      <h1>TezosProvider</h1>
      <h2>WalletConnect for Tezos</h2>
      <p>
        dApp prototype integrating WalletConnect's TezosProvider.
      </p>
      {(!projectId || projectId === "YOUR_PROJECT_ID") ? (
        <div className="warning">
          <p><b>The project is not initialized</b></p>
          <p>Set your project ID in the .env file</p>
        </div>
      ) : isConnected ? (
        <>
          <p>
            <b>Public Key: </b>
            {provider?.address ?? "No account connected"}
          </p>
          <p>
            <b>Balance: </b>
            {balance}
          </p>
          <div className="layout-container">
            <div className="btn-container">
              <button onClick={disconnect} onMouseEnter={describeClear}>Disconnect</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.GET_ACCOUNTS)}  onMouseEnter={describeClear}>Get Accounts</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SIGN)}  onMouseEnter={describeClear}>Sign</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_TRANSACTION)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_TRANSACTION)}>Send Transaction</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_DELEGATION)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_DELEGATION)}>Delegate</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_UNDELEGATION)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNDELEGATION)}>Undelegate</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_ORGINATION)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_ORGINATION)}>Originate</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_CONTRACT_CALL)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_CONTRACT_CALL)}>Contract call</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_STAKE)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_STAKE)}>Stake</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_UNSTAKE)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNSTAKE)}>Unstake</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_FINALIZE)}  onMouseEnter={() => describe(SAMPLE_KINDS.SEND_FINALIZE)}>Finalize</button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)} onMouseEnter={() => describe(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)}>Increase paid storage</button>
            </div>
            <div className="result-column">
              {result && (
                <>
                  <p>Result of the last operation:</p>
                  <pre>{lastKind}</pre>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </>
              )}
            {description && (
                <>
                  <p>Operation:</p>
                  <pre>{JSON.stringify(description, null, 2)}</pre>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <p>Connect your wallet to get started</p>
          <button onClick={connect}>Connect</button>
        </>
      )}
    </div>
  );
};

export default App;
