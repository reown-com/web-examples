import { WalletConnectModal } from "@walletconnect/modal";
import { useState } from "react";
import { TEZOS_ACTIONS, DEFAULT_TEZOS_METHODS } from "./utils/samples";
import TezosProvider, { formatTezosBalance, getChainId, TezosChainDataMainnet, TezosChainDataTestnet } from "./utils/tezos-provider";
import { PartialTezosTransactionOperation, TezosBallotOperation } from "@airgap/beacon-types";

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
  const [result, setResult] = useState<any>(null);
  const [description, setDescription] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [balance, setBalance] = useState("");

  console.log("Provider", provider);

  // 3. handle display_uri event and open modal
  if (provider.signer) {
    provider.signer.on("display_uri", async (uri: string) => {
      console.log("event display_uri", uri);
      await modal.openModal({
        uri,
      });
    });

    provider.signer.on("session_ping", ({ id, topic }: { id: string; topic: string }) => {
      console.log("Session Ping:", id, topic);
    });

    provider.signer.on("session_event", ({ event, chainId }: { event: any; chainId: string }) => {
      console.log("Session Event:", event, chainId);
    });

    provider.signer.on("session_update", ({ topic, params }: { topic: string; params: any }) => {
      console.log("Session Update:", topic, params);
    });

    provider.signer.on("session_delete", ({ id, topic }: { id: string; topic: string }) => {
      console.log("Session Delete:", id, topic);
    });
  }

  const getBalance = async () => {
    if (provider) {
      const balance = await provider.getBalance();
      setBalance(formatTezosBalance(balance));
    }
  };

  // 4. handle connect event
  const connect = async () => {
    try {
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
    if (provider.signer) {
      await provider.signer.disconnect();
    }
    setIsConnected(false);
    setResult(null); // Clear result on disconnect
  };

  // 6. handle operations
  const handleOp = async (method: string) => {
    if (!provider) return;

    try {
      let res = null;
      switch (method) {
        case "tezos_getAccounts":
          res = await provider.tezosGetAccounts();
          break;
        case "tezos_sign":
          res = await provider.tezosSign("05010000004254");
          break;
        case "tezos_send_transaction":
          res = await provider.tezosSendTransaction(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_TRANSACTION]);
          break;
        case "tezos_send_delegation":
          res = await provider.tezosSendDelegation(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_DELEGATION]);
          break;
        case "tezos_send_undelegation":
          res = await provider.tezosSendUndelegation();
          break;
        case "tezos_send_origination":
          res = await provider.tezosSendOrigination(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_ORGINATION]);
          const contractAddressList = await provider.getContractAddress(res.hash);
          if (contractAddressList.length > 0) {
            setContractAddress(contractAddressList[0]);
            console.log("TezosRpc stored contract:", contractAddressList[0]);
          } else {
            console.error("TezosRpc could not find contract address in origination operation.");
          }
          break;
        case "tezos_send_contract_call":
          const contract_call: PartialTezosTransactionOperation = {
            ...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL],
            destination: contractAddress,
          };
          res = await provider.tezosSendContractCall(contract_call);
          break;
        case "tezos_send_stake":
          res = await provider.tezosSendStake(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_STAKE]);
          break;
        case "tezos_send_unstake":
          res = await provider.tezosSendUnstake(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNSTAKE]);
          break;
        case "tezos_send_finalize":
          res = await provider.tezosSendFinalizeUnstake(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_FINALIZE]);
          break;
        case "tezos_send_ballot":
          const proposal = await provider.getCurrentProposal() || "[no proposal in progress]";
          const ballot : TezosBallotOperation = {
            ...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_BALLOT],
            proposal: proposal
          };
          res = await provider.tezosSendBallot(ballot);
          break;
          
        default:
          throw new Error(`Unsupported method ${method}`);
      }
      setResult(res);
      await getBalance();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error sending ${method}:`, error.name, error.message);
        setResult([error.name, error.message]);
      } else {
        console.error(`Error sending ${method}:`, error);
        setResult(error);
      }
      
    }
  };

  const describe = (method: string) => {
    switch (method) {
      case "tezos_send_transaction":
        setDescription(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_TRANSACTION]);
        break;
      case "tezos_send_delegation":
        setDescription(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_DELEGATION]);
        break;
      case "tezos_send_undelegation":
        setDescription(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNDELEGATION]);
        break;
      case "tezos_send_origination":
        setDescription(TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_ORGINATION]);
        break;
      case "tezos_send_contract_call":
        const contract_call = {
          ...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL],
          destination: contractAddress
            ? contractAddress
            : "[click Origination to get contract address]",
        };
        setDescription(contract_call);
        break;
      case "tezos_send_stake":
        setDescription({...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_STAKE], destination: provider.address});
        break;
      case "tezos_send_unstake":
        setDescription({...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNSTAKE], destination: provider.address});
        break;
      case "tezos_send_finalize":
        setDescription({...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_FINALIZE], destination: provider.address});
        break;
      case "tezos_send_ballot":
        const ballot = {
          ...TEZOS_ACTIONS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_BALLOT],
          source: provider.address,
        };
        setDescription(ballot);
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

      {isConnected ? (
        <>
          <p>
            <b>Public Key: </b>
            {provider?.address ?? "No account connected"}
          </p>
          <p>
            <b>Balance: </b>
            {balance}
          </p>
          <div className="btn-container">
          <button onClick={() => handleOp("tezos_getAccounts")}  onMouseEnter={describeClear}>Get Accounts</button>
          <button onClick={() => handleOp("tezos_sign")}  onMouseEnter={describeClear}>Sign</button>
          <button onClick={disconnect} onMouseEnter={describeClear}>Disconnect</button>
          </div>
          <div className="btn-container">
          <button onClick={() => handleOp("tezos_send_transaction")}  onMouseEnter={() => describe("tezos_send_transaction")}>Send Transaction</button>
          <button onClick={() => handleOp("tezos_send_delegation")}  onMouseEnter={() => describe("tezos_send_delegation")}>Delegate</button>
          <button onClick={() => handleOp("tezos_send_undelegation")}  onMouseEnter={() => describe("tezos_send_undelegation")}>Undelegate</button>
          <button onClick={() => handleOp("tezos_send_origination")}  onMouseEnter={() => describe("tezos_send_origination")}>Originate</button>
          <button onClick={() => handleOp("tezos_send_contract_call")}  onMouseEnter={() => describe("tezos_send_contract_call")}>Contract call</button>
          </div>
          <div className="btn-container">
          <button onClick={() => handleOp("tezos_send_stake")}  onMouseEnter={() => describe("tezos_send_stake")}>Stake</button>
          <button onClick={() => handleOp("tezos_send_unstake")}  onMouseEnter={() => describe("tezos_send_unstake")}>Unstake</button>
          <button onClick={() => handleOp("tezos_send_finalize")}  onMouseEnter={() => describe("tezos_send_finalize")}>Finalize</button>
          <button onClick={() => handleOp("tezos_send_ballot")}  onMouseEnter={() => describe("tezos_send_ballot")}>Ballot</button>
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
