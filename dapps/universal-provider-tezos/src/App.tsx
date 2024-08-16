import UniversalProvider from "@walletconnect/universal-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { signMessage, sendTransaction, TezosChainData, apiGetContractAddress, getAccounts, getChainId, apiGetTezosAccountBalance, formatTezosBalance } from "./utils/helpers";
import { DEFAULT_TEZOS_KINDS, DEFAULT_TEZOS_METHODS } from "./utils/samples";

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
            // events: ["chainChanged", "accountsChanged"], - kills "connect"
            // rpcMap
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
      DEFAULT_TEZOS_METHODS.TEZOS_SEND_TRANSACTION,
    );
  };

  const handleSendDelegation = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      DEFAULT_TEZOS_METHODS.TEZOS_SEND_DELEGATION,
    );
  };

  const handleSendUndelegation = async () => {
    return await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNDELEGATION,
    );
  };

  const handleSendOriginate = async () => {
    const res = await sendTransaction(
      TezosChainData["testnet"].id,
      provider,
      address!,
      DEFAULT_TEZOS_METHODS.TEZOS_SEND_ORGINATION,
    );
    console.log("TezosRpc origination result: ", res);
    const contractAddressList = await apiGetContractAddress(TezosChainData["testnet"].id, res.result);
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
      DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL,
      contractAddress,
    );
  };

  const handleOp = async (method: string) => {
    try {
      let res = null;
      switch (method) {
        case "tezos_getAccounts":
          res = await handleGetAccounts();
          break;
        case "tezos_sign":
          res = await handleSign();
          break;
        case "tezos_send_transaction":
          res = await handleSendTransaction();
          break;
        case "tezos_send_origination":
          res = await handleSendOriginate();
          break;
        case "tezos_send_contract_call":
          res = await handleSendContractCall();
          break;
        case "tezos_send_delegation":
          res = await handleSendDelegation();
          break;
        case "tezos_send_undelegation":
          res = await handleSendUndelegation();
          break;
        default:
          throw new Error(`Unsupported method ${method}`);
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
  }

  const describe = (method: string) => {
    switch (method) {
      case "tezos_send_transaction":
        setDescription(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_TRANSACTION]);
        break;
      case "tezos_send_delegation":
        setDescription(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_DELEGATION]);
        break;
      case "tezos_send_undelegation":
        setDescription(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNDELEGATION]);
        break;
      case "tezos_send_origination":
        setDescription(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_ORGINATION]);
        break;
      case "tezos_send_contract_call":
        const operation = JSON.parse(JSON.stringify(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL]));
        operation.destination = contractAddress
          ? contractAddress
          : "[click Origination to get contract address]";
        setDescription(operation);
        break;
      default:
        setDescription("No description available");
    }
  }

  const describeClear = () => {
    setDescription(undefined);
  }

  return (
    <div className="App">
      <h1>WalletConnect for Tezos</h1>
      <p>
        dApp prototype integrating WalletConnect's Tezos Universal Provider.
      </p>

      {isConnected ? (
        <>
          <p>
            <b>Public Key: </b>
            {address}
          </p>
          <p>
            <b>Balance: </b>
            {balance}
          </p>
          <div className="btn-container">
          <button onClick={() => handleOp("tezos_getAccounts")}  onMouseEnter={describeClear}>Get Accounts</button>
          <button onClick={() => handleOp("tezos_sign")}  onMouseEnter={describeClear}>Sign</button>
          <button onClick={() => handleOp("tezos_send_transaction")}  onMouseEnter={() => describe("tezos_send_transaction")}>Send Transaction</button>
          <button onClick={() => handleOp("tezos_send_delegation")}  onMouseEnter={() => describe("tezos_send_delegation")}>Delegate</button>
          <button onClick={() => handleOp("tezos_send_undelegation")}  onMouseEnter={() => describe("tezos_send_undelegation")}>Undelegate</button>
          <button onClick={() => handleOp("tezos_send_origination")}  onMouseEnter={() => describe("tezos_send_origination")}>Originate</button>
          <button onClick={() => handleOp("tezos_send_contract_call")}  onMouseEnter={() => describe("tezos_send_contract_call")}>Contract call</button>
          <button onClick={disconnect} onMouseEnter={describeClear}>Disconnect</button>
          </div>
          {result && (
            <>
              <p>Result of the last operation:</p>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </>
          )}
          {description && (
            <>
              <p>Operation:</p>
              <pre>{JSON.stringify(description, null, 2)}</pre>
            </>
          )}
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
