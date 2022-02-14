import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import QRCodeModal from "@walletconnect/legacy-modal";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_APP_METADATA,
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { ERROR } from "@walletconnect/utils";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { providers, utils } from "ethers";

/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Created | undefined;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chains: string[];
  pairings: string[];
  accounts: string[];
  balances: { symbol: string; balance: string }[];
  isFetchingBalances: boolean;
  setChains: any;
  onEnable: () => Promise<void>;
  web3Provider?: providers.Web3Provider;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function ClientContextProvider({ children }: { children: ReactNode | ReactNode[] }) {
  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<string[]>([]);
  const [session, setSession] = useState<SessionTypes.Created>();

  const [ethereumProvider, setEthereumProvider] = useState<EthereumProvider>();
  const [web3Provider, setWeb3Provider] = useState<providers.Web3Provider>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [balances, setBalances] = useState<{ symbol: string; balance: string }[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chains, setChains] = useState<string[]>([]);

  const resetApp = () => {
    setPairings([]);
    setSession(undefined);
    setBalances([]);
    setAccounts([]);
    setChains([]);
  };

  const getSupportedNamespaces = useCallback(() => {
    const supportedNamespaces: string[] = [];
    chains.forEach(chainId => {
      const [namespace] = chainId.split(":");
      if (!supportedNamespaces.includes(namespace)) {
        supportedNamespaces.push(namespace);
      }
    });

    return supportedNamespaces;
  }, [chains]);

  const getSupportedMethods = (namespaces: string[]) => {
    const supportedMethods: string[] = namespaces
      .map(namespace => {
        switch (namespace) {
          case "eip155":
            return DEFAULT_EIP155_METHODS;
          case "cosmos":
            return DEFAULT_COSMOS_METHODS;
          default:
            throw new Error(`No default methods for namespace: ${namespace}`);
        }
      })
      .flat();

    return supportedMethods;
  };

  const disconnect = useCallback(async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }
    await client.disconnect({
      topic: session.topic,
      reason: ERROR.USER_DISCONNECTED.format(),
    });
  }, [client, session]);

  const _subscribeToEvents = useCallback(async (_client: Client) => {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    let _session = {} as SessionTypes.Settled;

    if (_client.session.topics.length) {
      _session = await _client.session.get(_client.session.topics[0]);
    }

    _client.on(CLIENT_EVENTS.pairing.proposal, async (proposal: PairingTypes.Proposal) => {
      const { uri } = proposal.signal.params;
      console.log("EVENT", "QR Code Modal open");
      QRCodeModal.open(uri, () => {
        console.log("EVENT", "QR Code Modal closed");
      });
    });

    _client.on(CLIENT_EVENTS.pairing.created, async () => {
      debugger;
      setPairings(_client.pairing.topics);
    });

    _client.on(CLIENT_EVENTS.session.deleted, (deletedSession: SessionTypes.Settled) => {
      if (deletedSession.topic !== _session?.topic) return;
      console.log("EVENT", "session_deleted");
      resetApp();
    });
  }, []);

  // const _checkPersistedState = useCallback(
  //   async (_client: Client) => {
  //     if (typeof _client === "undefined") {
  //       throw new Error("WalletConnect is not initialized");
  //     }
  //     // populates existing pairings to state
  //     setPairings(_client.pairing.topics);
  //     if (typeof session !== "undefined") return;
  //     // populates existing session to state (assume only the top one)
  //     if (_client.session.topics.length) {
  //       const _session = await _client.session.get(_client.session.topics[0]);
  //       onSessionConnected(_session);
  //     }
  //   },
  //   [session, onSessionConnected],
  // );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const _client = await Client.init({
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
        projectId: DEFAULT_PROJECT_ID,
      });

      setClient(_client);
      await _subscribeToEvents(_client);
      // await _checkPersistedState(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [_subscribeToEvents]);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  useEffect(() => {
    const init = async () => {
      if (!client) return;

      //  Create WalletConnect Provider
      const ethereumProvider = new EthereumProvider({
        chainId: 42,
        rpc: {
          infuraId: "5dc0df7abe4645dfb06a9a8c39ede422",
        },
        // FIXME: `signer-connection` sub-dep is already specifying beta.23 -> typings mismatch.
        // @ts-ignore
        client,
      });
      const web3Provider = new providers.Web3Provider(ethereumProvider);

      setEthereumProvider(ethereumProvider);
      setWeb3Provider(web3Provider);

      // Enable session (triggers QR Code modal if we bound the listener on `client` for it).
      // const accounts = await ethereumProvider.enable();
      // console.log("accounts:", accounts);

      // const provider = new providers.Web3Provider(ethereumProvider);

      // console.log(provider);
      // console.log(await provider.listAccounts());
      // console.log(await provider.getNetwork());
      // console.log(provider.getSigner());
      // console.log(await provider.getBalance(accounts[0]));

      // const TEST_ETH_TRANSFER = {
      //   from: accounts[0],
      //   to: accounts[0],
      //   value: utils.parseEther("1").toHexString(),
      //   data: "0x",
      // };

      // const signer = provider.getSigner();
      // const transferTx = await signer.sendTransaction(TEST_ETH_TRANSFER);
    };

    init();
  }, [client]);

  const onEnable = useCallback(async () => {
    if (!ethereumProvider) {
      throw new ReferenceError("ethereumProvider is not defined.");
    }
    if (!web3Provider) {
      throw new ReferenceError("web3Provider is not defined.");
    }
    const accounts = await ethereumProvider.enable();
    setAccounts(accounts);

    setChains(["eip155:42"]);

    const balances = await Promise.all(
      accounts.map(async account => {
        const balance = await web3Provider.getBalance(account);
        return { symbol: "ETH", balance: utils.formatEther(balance) };
      }),
    );

    setBalances(balances);

    QRCodeModal.close();
  }, [ethereumProvider, web3Provider]);

  console.log(balances);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chains,
      client,
      session,
      disconnect,
      setChains,
      onEnable,
      web3Provider,
    }),
    [
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chains,
      client,
      session,
      disconnect,
      setChains,
      onEnable,
      web3Provider,
    ],
  );

  return (
    <ClientContext.Provider
      value={{
        ...value,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useWalletConnectClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useWalletConnectClient must be used within a ClientContextProvider");
  }
  return context;
}
