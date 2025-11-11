import { WalletConnectModal } from "@walletconnect/modal";
import { useEffect, useState, useCallback } from "react";
import { SAMPLES, SAMPLE_KINDS, getBakerAddress } from "./utils/samples";
import {
  TezosProvider,
  TezosChainDataTestnet,
  TezosGetAccountResponse,
  TezosSendResponse,
  TezosSignResponse,
  TezosChainDataMainnet,
} from "@trili/tezos-provider";
import { ErrorObject } from "@walletconnect/utils";
import { stringToBytes } from "@taquito/utils";

const projectId = import.meta.env.VITE_PROJECT_ID;

const modal = new WalletConnectModal({ projectId });

const App = () => {
  const [provider, setProvider] = useState<TezosProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastKind, setLastKind] = useState<SAMPLE_KINDS | undefined>(undefined);
  const [result, setResult] = useState<
    | TezosSendResponse
    | TezosSignResponse
    | TezosGetAccountResponse
    | ErrorObject
    | string
    | string[]
    | null
  >(null);
  const [description, setDescription] = useState<
    Record<string, unknown> | string | undefined
  >(undefined);
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
        ({ event, chainId }: { event: unknown; chainId: string }) =>
          console.log("Session Event:", event, chainId),
      );
      signer?.on(
        "session_update",
        ({ event, chainId }: { event: unknown; chainId: string }) =>
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
  const connect = useCallback(
    async (chain: string) => {
      if (!provider) return;

      try {
        switch (chain) {
          case "mainnet":
            await provider.connect({ chain: TezosChainDataMainnet });
            break;
          case "ghostnet":
            await provider.connect({ chain: TezosChainDataTestnet });
            break;
          default:
            throw new Error(`Unsupported chain: ${chain}`);
        }
        setIsConnected(true);
        console.log("Connected to Tezos");
        modal.closeModal();
        const balance = await provider.getBalance();
        setBalance(TezosProvider.formatTezosBalance(balance));
      } catch (error) {
        console.error("Error connecting to Tezos:", error);
      }
    },
    [provider],
  );

  // Disconnect from Tezos
  const disconnect = useCallback(async () => {
    if (!provider || !provider.signer) return;
    try {
      await provider.signer.disconnect();
      setIsConnected(false);
      setResult(null);
      setBalance("");
      setContractAddress("[click Origination to get contract address]");
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
            res = await provider.getAccounts();
            break;
          case SAMPLE_KINDS.SIGN: {
            const formattedInput = ` Payload from TezosProvider dapp generated at ${new Date().toISOString()}`;
            // build payload following https://taquito.io/docs/signing/#generating-a-signature-with-beacon-sdk
            const bytes = stringToBytes(formattedInput);
            const bytesLength = (bytes.length / 2).toString(16);
            const addPadding = `00000000${bytesLength}`;
            const paddedBytesLength = addPadding.slice(-8);
            const payload = "05" + "01" + paddedBytesLength + bytes;
            res = await provider.sign(payload);
            break;
          }
          case SAMPLE_KINDS.SEND_TRANSACTION:
            res = await provider.sendTransaction(
              SAMPLES[SAMPLE_KINDS.SEND_TRANSACTION],
            );
            break;
          case SAMPLE_KINDS.SEND_DELEGATION:
            res = await provider.sendDelegation({
              ...SAMPLES[SAMPLE_KINDS.SEND_DELEGATION],
              delegate: getBakerAddress(provider?.getChainId()),
            });
            break;
          case SAMPLE_KINDS.SEND_UNDELEGATION:
            res = await provider.sendUndelegation();
            break;
          case SAMPLE_KINDS.SEND_ORGINATION:
            res = await provider.sendOrigination(
              SAMPLES[SAMPLE_KINDS.SEND_ORGINATION],
            );
            for (let attempt = 0; attempt < 10; attempt++) {
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
            res = await provider.sendContractCall({
              ...SAMPLES[SAMPLE_KINDS.SEND_CONTRACT_CALL],
              destination: contractAddress,
            });
            break;
          case SAMPLE_KINDS.SEND_STAKE:
            res = await provider.sendStake(SAMPLES[SAMPLE_KINDS.SEND_STAKE]);
            break;
          case SAMPLE_KINDS.SEND_UNSTAKE:
            res = await provider.sendUnstake(
              SAMPLES[SAMPLE_KINDS.SEND_UNSTAKE],
            );
            break;
          case SAMPLE_KINDS.SEND_FINALIZE:
            res = await provider.sendFinalizeUnstake(
              SAMPLES[SAMPLE_KINDS.SEND_FINALIZE],
            );
            break;
          case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
            res = await provider.sendIncreasePaidStorage({
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
          setResult(error as ErrorObject);
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
        case SAMPLE_KINDS.SEND_UNDELEGATION:
          setDescription(SAMPLES[kind]);
          break;
        case SAMPLE_KINDS.SEND_DELEGATION:
          // provider address depends on the chain
          setDescription({
            ...SAMPLES[kind],
            delegate: getBakerAddress(provider?.getChainId()),
          });
          break;
        case SAMPLE_KINDS.SEND_ORGINATION:
          setDescription(SAMPLES[kind] as unknown as Record<string, unknown>);
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
          setDescription({
            ...SAMPLES[kind],
            destination: provider?.connection?.address,
          });
          break;
        default:
          setDescription("No description available");
      }
    },
    [contractAddress, provider?.connection?.address],
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
            {provider?.connection?.address ?? "No account connected"}
          </p>
          <p>
            <b>Chain: </b>
            {provider?.getChainId() ?? "No chain connected"}
          </p>
          <p>
            <b>Balance: </b>
            {balance}
          </p>
          <p>
            <b>Contract address: </b>
            {contractAddress}
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
          <div className="layout-container">
            <div className="btn-container">
              <button onClick={() => connect("ghostnet")}>
                Connect ghostnet
              </button>
              <button onClick={() => connect("mainnet")}>
                Connect mainnet
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
