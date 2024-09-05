import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { signMessage, sendTransaction, TezosChainData, apiGetContractAddress, getAccounts, getChainId, apiGetTezosAccountBalance, formatTezosBalance } from "./utils/helpers";
import { SAMPLE_KINDS, SAMPLES } from "./utils/samples";

const projectId = import.meta.env.VITE_PROJECT_ID;

const events: string[] = [];
// const events = ["display_uri", "chainChanged", "accountsChanged", "disconnect"];
const rpcMap = {
  "tezos:mainnet": "https://rpc.tzbeta.net",
  "tezos:testnet": "https://rpc.ghostnet.teztnets.com"
}

// 1. select chains (tezos)
const chains = ["tezos:mainnet", "tezos:testnet"];

// 2. select methods (tezos)
const methods = ["tezos_getAccounts", "tezos_sign", "tezos_send"];

// 3. create modal instance
const modal = new WalletConnectModal({
  projectId,
  chains,
});

// 4. create provider instance
const provider = await UniversalProvider.init({
  logger: "debug",
  // relayUrl: "wss://relay.walletconnect.com",
  projectId: projectId,
  metadata: {
    name: "WalletConnect @ Tezos",
    description: "Tezos integration with WalletConnect's Universal Provider",
    url: "https://walletconnect.com/",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  },
  // client: undefined, // optional instance of @walletconnect/sign-client
});

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastKind, setLastKind] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [description, setDescription] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [balance, setBalance] = useState("");

  // 5. get address once loaded
  const address =
    provider.session?.namespaces.tezos?.accounts[0].split(":")[2];

  // 6. handle display_uri event and open modal
  provider.on("display_uri", async (uri: string) => {
    console.log("event display_uri", uri);
    await modal.openModal({
      uri,
    });
  });

  provider.on("session_ping", ({ id, topic }: { id: string; topic: string }) => {
    console.log("Session Ping:", id, topic);
  });

  provider.on("session_event", ({ event, chainId }: { event: any; chainId: string }) => {
    console.log("Session Event:", event, chainId);
  });

  provider.on("session_update", ({ topic, params }: { topic: string; params: any }) => {
    console.log("Session Update:", topic, params);
  });

  provider.on("session_delete", ({ id, topic }: { id: string; topic: string }) => {
    console.log("Session Delete:", id, topic);
  });

  // 7. handle connect event
  const connect = async () => {
    try {
      await provider.connect({
        namespaces: {
          tezos: {
            methods,
            chains,
            events:[],
          },
        },
        skipPairing: false,
      });
      setIsConnected(true);
      console.log("Connected successfully. Provider", provider);
      console.log("Connected successfully. Session", provider.session);
      const chainId = await getChainId("tezos:testnet");
      provider.setDefaultChain(chainId, rpcMap["tezos:testnet"]);
      console.log("Connected to chain:", chainId);
      await getBalance();
    } catch (error) {
      console.error("Connection error:", error);
    }
    modal.closeModal();
  };

  // 8. handle disconnect event
  const disconnect = async () => {
    await provider.disconnect();
    setIsConnected(false);
    setResult(null); // Clear result on disconnect
  };

  // 9. handle operations
  const handleGetAccounts = async () => {
    return await getAccounts(
      TezosChainData["testnet"].id,
      provider,
      address!
    );
  };

  const handleSign = async () => {
    return await signMessage(
      TezosChainData["testnet"].id,
      provider,
      address!
    );
  };

  const handleSendTransaction = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      SAMPLES[SAMPLE_KINDS.SEND_TRANSACTION],
    );
  };

  const handleSendDelegation = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      SAMPLES[SAMPLE_KINDS.SEND_DELEGATION],
    );
  };

  const handleSendUndelegation = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      SAMPLES[SAMPLE_KINDS.SEND_UNDELEGATION],
    );
  };

  const handleSendOriginate = async () => {
    const res = await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      SAMPLES[SAMPLE_KINDS.SEND_ORGINATION],
    );
    console.log("TezosRpc origination result: ", res);
    const contractAddressList = await apiGetContractAddress(TezosChainData["testnet"].id, res.hash);
    if (contractAddressList.length > 0) {
      setContractAddress(contractAddressList[0]);
      console.log("TezosRpc stored contract: ", contractAddressList[0]);
    } else {
      console.error("TezosRpc could not find contract address in origination operation.");
    }
    return res;
  };

  const handleSendContractCall = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      {...SAMPLES[SAMPLE_KINDS.SEND_CONTRACT_CALL], destination: contractAddress},
    );
  };

  const handleSendStake = async () => {
    if (!address) {
      throw new Error("Address is not set");
    }
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      {...SAMPLES[SAMPLE_KINDS.SEND_STAKE], destination: address},
    );
  };

  const handleSendUnstake = async () => {
    if (!address) {
      throw new Error("Address is not set");
    }
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      {...SAMPLES[SAMPLE_KINDS.SEND_UNSTAKE], destination: address},
    );
  };

  const handleSendFinalize = async () => {
    if (!address) {
      throw new Error("Address is not set");
    }
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      {...SAMPLES[SAMPLE_KINDS.SEND_FINALIZE], destination: address},
    );
  };

  const handleSendIncreasePaidStorage = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      {...SAMPLES[SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE], destination: contractAddress},
    );
  };

  const handleOp = async (kind: SAMPLE_KINDS) => {
    if (!provider) return;

    setLastKind(kind);
    setResult("Waiting for response from the Wallet...");

    try {
      let res = null;
      switch (kind) {
        case SAMPLE_KINDS.GET_ACCOUNTS:
          res = await handleGetAccounts();
          break;
        case SAMPLE_KINDS.SIGN:
          res = await handleSign();
          break;
        case SAMPLE_KINDS.SEND_TRANSACTION:
          res = await handleSendTransaction();
          break;
        case SAMPLE_KINDS.SEND_ORGINATION:
          res = await handleSendOriginate();
          break;
        case SAMPLE_KINDS.SEND_CONTRACT_CALL:
          res = await handleSendContractCall();
          break;
        case SAMPLE_KINDS.SEND_DELEGATION:
          res = await handleSendDelegation();
          break;
        case SAMPLE_KINDS.SEND_UNDELEGATION:
          res = await handleSendUndelegation();
          break;
        case SAMPLE_KINDS.SEND_STAKE:
          res = await handleSendStake();
          break;
        case SAMPLE_KINDS.SEND_UNSTAKE:
          res = await handleSendUnstake();
          break;
        case SAMPLE_KINDS.SEND_FINALIZE:
          res = await handleSendFinalize();
          break;
        case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
          res = await handleSendIncreasePaidStorage();
          break;
  
        default:
          throw new Error(`Unsupported method ${kind}`);
      }
      setResult(res);
      console.log(res);
      await getBalance();
    } catch (error) {
      console.error("Error sending ${method}:", error);
      setResult(error);
    }
  };

  const getBalance = async () => {
    const balance = await apiGetTezosAccountBalance(address!, "testnet");
    setBalance(formatTezosBalance(balance));
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
        setDescription({...SAMPLES[kind], destination: address});
        break;
      case SAMPLE_KINDS.SEND_UNSTAKE:
        setDescription({...SAMPLES[kind], destination: address});
        break;
      case SAMPLE_KINDS.SEND_FINALIZE:
        setDescription({...SAMPLES[kind], destination: address});
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
      <h1>UniversalProvider</h1>
      <h2>WalletConnect for Tezos</h2>
      <p>
        dApp prototype integrating WalletConnect's Tezos Universal Provider.
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
            {address ?? "No account connected"}
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
