import { WalletConnectModal } from "@walletconnect/modal";
import { useEffect, useState, useCallback } from "react";
import { SAMPLES, SAMPLE_KINDS } from "./utils/samples";
import TezosProvider, {
  TezosChainDataMainnet,
  TezosChainDataTestnet,
} from "@walletconnect/tezos-provider";

const projectId = import.meta.env.VITE_PROJECT_ID;

const modal = new WalletConnectModal({ projectId });

const App = () => {
  const [provider, setProvider] = useState<TezosProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastKind, setLastKind] = useState<SAMPLE_KINDS | null>(null);
  const [result, setResult] = useState<any>(null);
  const [description, setDescription] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState(
    "[click Origination to get contract address]",
  );
  const [balance, setBalance] = useState("");

  // Initialize WalletConnect Modal and TezosProvider
  useEffect(() => {
    const initProvider = async () => {
      const providerInstance = await TezosProvider.init({
        logger: "debug",
        projectId,
        metadata: {
          name: "WalletConnect @ Tezos",
          description: "Tezos integration with WalletConnect's Tezos Provider",
          url: "https://walletconnect.com/",
          icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
      });
      setProvider(providerInstance);

      const signer = providerInstance.signer;
      signer?.on("display_uri", async (uri: string) => {
        await modal.openModal({ uri });
      });

      signer?.on(
        "session_ping",
        ({ id, topic }: { id: string; topic: string }) =>
          console.log("Session Ping:", id, topic),
      );
      signer?.on(
        "session_event",
        ({ event, chainId }: { event: any; chainId: string }) =>
          console.log("Session Event:", event, chainId),
      );
      signer?.on(
        "session_update",
        ({ event, chainId }: { event: any; chainId: string }) =>
          console.log("Session Update:", event, chainId),
      );

      signer?.on(
        "session_delete",
        ({ id, topic }: { id: string; topic: string }) => {
          console.log("Session Delete:", id, topic);
          setIsConnected(false);
          setProvider(null);
        },
      );

      signer?.on("connect", ({ id, topic }: { id: string; topic: string }) => {
        console.log("Connected:", id, topic);
        setIsConnected(true);
      });

      signer?.on(
        "disconnect",
        ({ id, topic }: { id: string; topic: string }) => {
          console.log("Disconnected:", id, topic);
          setIsConnected(false);
        },
      );
    };
    initProvider();
  }, []);

  // Connect to Tezos
  const connect = useCallback(async () => {
    if (!provider) return;

    try {
      await provider.connect({
        chains: [TezosChainDataTestnet, TezosChainDataMainnet],
      });
      setIsConnected(true);
      console.log("Connected to Tezos");
      const balance = await provider.getBalance();
      setBalance(TezosProvider.formatTezosBalance(balance));
    } catch (error) {
      console.error("Error connecting to Tezos:", error);
    } finally {
      modal.closeModal();
    }
  }, [provider]);

  // Disconnect from Tezos
  const disconnect = useCallback(async () => {
    if (!provider || !provider.signer) return;
    try {
      await provider.signer.disconnect();
      setIsConnected(false);
      setResult(null);
    } catch (error) {
      console.error("Error disconnecting from Tezos:", error);
    }
  }, [provider]);

  // Handle Tezos operations
  const handleOp = useCallback(
    async (kind: SAMPLE_KINDS) => {
      if (!provider) return;

      setLastKind(kind);
      setResult("Waiting for response...");

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
            res = await provider.tezosSendTransaction(
              SAMPLES[SAMPLE_KINDS.SEND_TRANSACTION],
            );
            break;
          case SAMPLE_KINDS.SEND_DELEGATION:
            res = await provider.tezosSendDelegation(
              SAMPLES[SAMPLE_KINDS.SEND_DELEGATION],
            );
            break;
          case SAMPLE_KINDS.SEND_UNDELEGATION:
            res = await provider.tezosSendUndelegation();
            break;
          case SAMPLE_KINDS.SEND_ORGINATION:
            res = await provider.tezosSendOrigination(
              SAMPLES[SAMPLE_KINDS.SEND_ORGINATION],
            );
            for (let attempt = 0; attempt < 5; attempt++) {
              const contractAddressList = await provider.getContractAddress(
                res.hash,
              );
              if (contractAddressList.length > 0) {
                setContractAddress(contractAddressList[0]);
                console.log(
                  "TezosRpc stored contract:",
                  contractAddressList[0],
                );
                break;
              }
              console.log("Waiting for contract address...");
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            if (!contractAddress) {
              setResult(`Indexer cannot find contract for op hash ${res.hash}`);
              return;
            }
            break;
          case SAMPLE_KINDS.SEND_CONTRACT_CALL:
            res = await provider.tezosSendContractCall({
              ...SAMPLES[SAMPLE_KINDS.SEND_CONTRACT_CALL],
              destination: contractAddress,
            });
            break;
          case SAMPLE_KINDS.SEND_STAKE:
            res = await provider.tezosSendStake(
              SAMPLES[SAMPLE_KINDS.SEND_STAKE],
            );
            break;
          case SAMPLE_KINDS.SEND_UNSTAKE:
            res = await provider.tezosSendUnstake(
              SAMPLES[SAMPLE_KINDS.SEND_UNSTAKE],
            );
            break;
          case SAMPLE_KINDS.SEND_FINALIZE:
            res = await provider.tezosSendFinalizeUnstake(
              SAMPLES[SAMPLE_KINDS.SEND_FINALIZE],
            );
            break;
          case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
            res = await provider.tezosSendIncreasePaidStorage({
              ...SAMPLES[SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE],
              destination: contractAddress,
            });
            break;
          default:
            throw new Error(`Unsupported operation: ${kind}`);
        }
        setResult(res);
        const balance = await provider.getBalance();
        setBalance(TezosProvider.formatTezosBalance(balance));
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error sending ${kind}:`, error.name, error.message);
          setResult([error.name, error.message]);
        } else {
          console.error(`Error sending ${kind}:`, error);
          setResult(error);
        }
      }
    },
    [provider, contractAddress],
  );

  // Provide operation descriptions
  const describe = useCallback(
    (kind: SAMPLE_KINDS) => {
      switch (kind) {
        case SAMPLE_KINDS.SEND_TRANSACTION:
        case SAMPLE_KINDS.SEND_DELEGATION:
        case SAMPLE_KINDS.SEND_UNDELEGATION:
        case SAMPLE_KINDS.SEND_ORGINATION:
          setDescription(SAMPLES[kind]);
          break;
        case SAMPLE_KINDS.SEND_CONTRACT_CALL:
        case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
          setDescription({
            ...SAMPLES[kind],
            destination: contractAddress,
          });
          break;
        case SAMPLE_KINDS.SEND_STAKE:
        case SAMPLE_KINDS.SEND_UNSTAKE:
        case SAMPLE_KINDS.SEND_FINALIZE:
          setDescription({ ...SAMPLES[kind], destination: provider?.address });
          break;
        default:
          setDescription("No description available");
      }
    },
    [contractAddress, provider?.address],
  );

  const describeClear = useCallback(() => {
    setDescription(undefined);
  }, []);

  return (
    <div className="App">
      <h1>TezosProvider</h1>
      <h2>WalletConnect for Tezos</h2>
      {!projectId || projectId === "YOUR_PROJECT_ID" ? (
        <div className="warning">
          <p>
            <b>The project is not initialized</b>
          </p>
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
              <button onClick={disconnect} onMouseEnter={describeClear}>
                Disconnect
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.GET_ACCOUNTS)}
                onMouseEnter={describeClear}
              >
                Get Accounts
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SIGN)}
                onMouseEnter={describeClear}
              >
                Sign
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_TRANSACTION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_TRANSACTION)}
              >
                Send Transaction
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_DELEGATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_DELEGATION)}
              >
                Delegate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_UNDELEGATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNDELEGATION)}
              >
                Undelegate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_ORGINATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_ORGINATION)}
              >
                Originate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_CONTRACT_CALL)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_CONTRACT_CALL)}
              >
                Contract call
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_STAKE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_STAKE)}
              >
                Stake
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_UNSTAKE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNSTAKE)}
              >
                Unstake
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_FINALIZE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_FINALIZE)}
              >
                Finalize
              </button>
              <button
                onClick={() =>
                  handleOp(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)
                }
                onMouseEnter={() =>
                  describe(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)
                }
              >
                Increase paid storage
              </button>
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
