import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Web3Modal } from "@web3modal/standalone";
import { apiGetChainNamespace, ChainsMap } from "caip-api";
import UniversalProvider from "@walletconnect/universal-provider";
import Client from "@walletconnect/sign-client";
import Web3 from "web3";
import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from "../constants";
import { utils } from "ethers";
import { AccountBalances, ChainNamespaces, getAllChainNamespaces } from "../helpers";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Struct | undefined;
  connect: (caipChainId: string, pairing?: { topic: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chain: string;
  pairings: PairingTypes.Struct[];
  accounts: string[];
  balances: AccountBalances;
  isFetchingBalances: boolean;
  chainData: ChainNamespaces;
  web3Provider?: Web3;
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
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [ethereumProvider, setEthereumProvider] = useState<UniversalProvider>();
  const [web3Provider, setWeb3Provider] = useState<Web3>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCheckedPersistedSession, setHasCheckedPersistedSession] = useState(false);

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [chain, setChain] = useState<string>("");
  const [web3Modal, setWeb3Modal] = useState<Web3Modal>();

  const resetApp = () => {
    setPairings([]);
    setSession(undefined);
    setBalances({});
    setAccounts([]);
    setChain("");
  };

  const loadChainData = async () => {
    const namespaces = getAllChainNamespaces();
    const chainData: ChainNamespaces = {};
    await Promise.all(
      namespaces.map(async namespace => {
        let chains: ChainsMap | undefined;
        try {
          chains = await apiGetChainNamespace(namespace);
        } catch (e) {
          // ignore error
        }
        if (typeof chains !== "undefined") {
          chainData[namespace] = chains;
        }
      }),
    );
    setChainData(chainData);
  };

  const disconnect = useCallback(async () => {
    if (typeof ethereumProvider === "undefined") {
      throw new Error("ethereumProvider is not initialized");
    }
    await ethereumProvider.disconnect();
    resetApp();
  }, [ethereumProvider]);

  const _subscribeToProviderEvents = useCallback(
    async (_client: UniversalProvider) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

      _client.on("display_uri", async (uri: string) => {
        console.log("EVENT", "QR Code Modal open");
        web3Modal?.openModal({ uri });
      });

      // Subscribe to session ping
      _client.on("session_ping", ({ id, topic }: { id: number; topic: string }) => {
        console.log("EVENT", "session_ping");
        console.log(id, topic);
      });

      // Subscribe to session event
      _client.on("session_event", ({ event, chainId }: { event: any; chainId: string }) => {
        console.log("EVENT", "session_event");
        console.log(event, chainId);
      });

      // Subscribe to session update
      _client.on(
        "session_update",
        ({ topic, session }: { topic: string; session: SessionTypes.Struct }) => {
          console.log("EVENT", "session_updated");
          setSession(session);
        },
      );

      // Subscribe to session delete
      _client.on("session_delete", ({ id, topic }: { id: number; topic: string }) => {
        console.log("EVENT", "session_deleted");
        console.log(id, topic);
        resetApp();
      });
    },
    [web3Modal],
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const provider = await UniversalProvider.init({
        projectId: DEFAULT_PROJECT_ID,
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
      });

      const web3Modal = new Web3Modal({
        projectId: DEFAULT_PROJECT_ID,
      });

      setEthereumProvider(provider);
      setClient(provider.client);
      setWeb3Modal(web3Modal);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const createWeb3Provider = useCallback((ethereumProvider: UniversalProvider) => {
    const web3Provider = new Web3(ethereumProvider);
    setWeb3Provider(web3Provider);
  }, []);

  const connect = useCallback(
    async (caipChainId: string, pairing?: { topic: string }) => {
      if (!ethereumProvider) {
        throw new ReferenceError("WalletConnect Client is not initialized.");
      }

      const chainId = caipChainId.split(":").pop();

      console.log("Enabling EthereumProvider for chainId: ", chainId);

      const customRpcs = Object.keys(chainData.eip155).reduce(
        (rpcs: Record<string, string>, chainId) => {
          rpcs[chainId] = chainData.eip155[chainId].rpc[0];
          return rpcs;
        },
        {},
      );

      const session = await ethereumProvider.connect({
        namespaces: {
          eip155: {
            methods: [
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTypedData",
            ],
            chains: [`eip155:${chainId}`],
            events: ["chainChanged", "accountsChanged"],
            rpcMap: customRpcs,
          },
        },
        pairingTopic: pairing?.topic,
      });

      createWeb3Provider(ethereumProvider);
      const _accounts = await ethereumProvider.enable();
      console.log("_accounts", _accounts);
      setAccounts(_accounts);
      setSession(session);
      setChain(caipChainId);

      web3Modal?.closeModal();
    },
    [ethereumProvider, chainData.eip155, createWeb3Provider, web3Modal],
  );

  const onSessionConnected = useCallback(
    async (_session: SessionTypes.Struct) => {
      if (!ethereumProvider) {
        throw new ReferenceError("EthereumProvider is not initialized.");
      }
      const allNamespaceAccounts = Object.values(_session.namespaces)
        .map(namespace => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(_session.namespaces);

      const chainData = allNamespaceAccounts[0].split(":");
      const caipChainId = `${chainData[0]}:${chainData[1]}`;
      console.log("restored caipChainId", caipChainId);
      setChain(caipChainId);
      setSession(_session);
      setAccounts(allNamespaceAccounts.map(account => account.split(":")[2]));
      console.log("RESTORED", allNamespaceChains, allNamespaceAccounts);
      createWeb3Provider(ethereumProvider);
    },
    [ethereumProvider, createWeb3Provider],
  );

  const _checkForPersistedSession = useCallback(
    async (provider: UniversalProvider) => {
      if (typeof provider === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      const pairings = provider.client.pairing.getAll({ active: true });
      // populates existing pairings to state
      setPairings(pairings);
      console.log("RESTORED PAIRINGS: ", pairings);
      if (typeof session !== "undefined") return;
      // populates (the last) existing session to state
      if (ethereumProvider?.session) {
        const _session = ethereumProvider?.session;
        console.log("RESTORED SESSION:", _session);
        await onSessionConnected(_session);
        return _session;
      }
    },
    [session, ethereumProvider, onSessionConnected],
  );

  useEffect(() => {
    loadChainData();
  }, []);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  useEffect(() => {
    if (ethereumProvider && web3Modal) _subscribeToProviderEvents(ethereumProvider);
  }, [_subscribeToProviderEvents, ethereumProvider, web3Modal]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!web3Provider || !accounts) return;

      try {
        setIsFetchingBalances(true);
        const _balances = await Promise.all(
          accounts.map(async account => {
            const balance = await web3Provider.eth.getBalance(account);
            return {
              account,
              symbol: "ETH",
              balance: utils.formatEther(balance),
              contractAddress: "",
            };
          }),
        );

        const balancesByAccount = _balances.reduce((obj, balance) => {
          obj[balance.account] = balance;
          return obj;
        }, {} as AccountBalances);

        setBalances(balancesByAccount);
      } catch (error: any) {
        throw new Error(error);
      } finally {
        setIsFetchingBalances(false);
      }
    };

    fetchBalances();
  }, [web3Provider, accounts]);

  useEffect(() => {
    const getPersistedSession = async () => {
      if (!ethereumProvider) return;
      await _checkForPersistedSession(ethereumProvider);
      setHasCheckedPersistedSession(true);
    };

    if (ethereumProvider && chainData && !hasCheckedPersistedSession) {
      getPersistedSession();
    }
  }, [ethereumProvider, chainData, _checkForPersistedSession, hasCheckedPersistedSession]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      connect,
      chainData,
      web3Provider,
    }),
    [
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      connect,
      chainData,
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
