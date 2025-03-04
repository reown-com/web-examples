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
import UniversalProvider from "@walletconnect/universal-provider";
import { SessionTypes } from "@walletconnect/types";
import Client, { SignClient } from "@walletconnect/sign-client";

import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from "../constants";
import { providers, utils } from "ethers";
import { AccountBalances, ChainNamespaces, getAllChainNamespaces } from "../helpers";
import { EIP155ChainData } from "../chains/eip155";
/**
 * Types
 */
export interface ISessionData {
  session: SessionTypes.Struct;
  accounts: string[];
  chain: string;
  balances: AccountBalances;
  web3Provider: providers.Web3Provider;
  client: Client;
  universalProvider: UniversalProvider;
}

interface IContext {
  client: Client | undefined;
  connect: (caipChainId: string, pairing?: { topic: string }) => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  isInitializing: boolean;
  isFetchingBalances: boolean;
  chainData: ChainNamespaces;
  sessionsData: Record<string, ISessionData>;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

export function ClientContextProvider({ children }: { children: ReactNode | ReactNode[] }) {
  const [client, setClient] = useState<Client>();
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([]);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [web3Modal, setWeb3Modal] = useState<Web3Modal>();
  const [sessionsData, setSessionsData] = useState<Record<string, ISessionData>>({});

  const updateSessionData = useCallback((data: ISessionData) => {
    setSessionsData(prev => ({
      ...prev,
      [data.session.topic]: {
        ...prev[data.session.topic],
        ...data,
      },
    }));
  }, []);

  const removeSessionData = useCallback((topic: string) => {
    setSessionsData(prev => {
      const newSessionsData = { ...prev };
      delete newSessionsData[topic];
      return newSessionsData;
    });
  }, []);

  const loadChainData = async () => {
    const namespaces = getAllChainNamespaces();
    const chainData: ChainNamespaces = {};
    await Promise.all(
      namespaces.map(async namespace => {
        let chains;
        switch (namespace) {
          case "eip155":
            chains = EIP155ChainData;
            break;

          default:
            console.error("Unknown chain namespace: ", namespace);
        }

        if (typeof chains !== "undefined") {
          chainData[namespace] = chains;
        }
      }),
    );
    setChainData(chainData);
  };

  const disconnect = useCallback(
    async (topic: string) => {
      const sessionData = sessionsData[topic];
      if (!sessionData) return;

      await sessionData.universalProvider.disconnect();
      removeSessionData(topic);
    },
    [removeSessionData, sessionsData],
  );

  const subscribeToProviderEvents = useCallback(
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
          const sessionData = sessionsData[topic];
          if (!sessionData) return;

          sessionData.session = session;
          updateSessionData(sessionData);
        },
      );

      // Subscribe to session delete
      _client.on("session_delete", ({ id, topic }: { id: number; topic: string }) => {
        console.log("EVENT", "session_deleted");
        console.log(id, topic);
        removeSessionData(topic);
      });
    },
    [removeSessionData, sessionsData, updateSessionData, web3Modal],
  );

  const fetchBalances = useCallback(
    async (accounts: string[], web3Provider: providers.Web3Provider) => {
      try {
        setIsFetchingBalances(true);
        const _balances = await Promise.all(
          accounts.map(async account => {
            const balance = await web3Provider.getBalance(account);
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

        return balancesByAccount;
      } catch (error: any) {
        console.error(error);
      } finally {
        setIsFetchingBalances(false);
      }
    },
    [],
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      if (!DEFAULT_PROJECT_ID) return;

      const client = await SignClient.init({
        projectId: DEFAULT_PROJECT_ID,
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
      });

      setClient(client);

      const sessions = client.session.getAll();

      console.log("SESSIONS", sessions);

      for (const session of sessions) {
        const provider = await UniversalProvider.init({
          projectId: DEFAULT_PROJECT_ID,
          logger: DEFAULT_LOGGER,
          relayUrl: DEFAULT_RELAY_URL,
          client: client,
          session: session,
        });

        const accounts = await provider.enable();
        const web3Provider = new providers.Web3Provider(provider);
        const balances = (await fetchBalances(accounts, web3Provider)) || {};

        updateSessionData({
          session,
          accounts,
          chain: `eip155:${await provider.request({ method: "eth_chainId" })}`,
          balances,
          web3Provider,
          client,
          universalProvider: provider,
        });
        subscribeToProviderEvents(provider);
      }

      const web3Modal = new Web3Modal({
        projectId: DEFAULT_PROJECT_ID,
        walletConnectVersion: 2,
      });

      setWeb3Modal(web3Modal);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [fetchBalances, subscribeToProviderEvents, updateSessionData]);

  const connect = useCallback(
    async (caipChainId: string) => {
      try {
        if (!client) {
          throw new ReferenceError("WalletConnect Client is not initialized.");
        }

        const chainId = caipChainId.split(":").pop();

        console.log("Enabling EthereumProvider for chainId: ", chainId);

        const provider = await UniversalProvider.init({
          projectId: DEFAULT_PROJECT_ID,
          logger: DEFAULT_LOGGER,
          relayUrl: DEFAULT_RELAY_URL,
          client: client,
        });

        subscribeToProviderEvents(provider);

        const session = await provider.connect({
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
              rpcMap: {
                chainId: `https://rpc.walletconnect.com?chainId=eip155:${chainId}&projectId=${DEFAULT_PROJECT_ID}`,
              },
            },
          },
        });

        if (!session) {
          throw new Error("Session is not initialized");
        }
        const accounts = await provider.enable();
        const web3Provider = new providers.Web3Provider(provider);
        const balances = (await fetchBalances(accounts, web3Provider)) || {};
        const sessionData: ISessionData = {
          session,
          accounts,
          chain: `eip155:${await provider.request({ method: "eth_chainId" })}`,
          balances,
          web3Provider,
          client,
          universalProvider: provider,
        };

        updateSessionData(sessionData);
      } catch (error) {
        throw error;
      } finally {
        web3Modal?.closeModal();
      }
    },
    [client, fetchBalances, subscribeToProviderEvents, updateSessionData, web3Modal],
  );

  useEffect(() => {
    loadChainData();
  }, []);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  const value = useMemo(
    () => ({
      isInitializing,
      isFetchingBalances,
      client,
      disconnect,
      connect,
      chainData,
      sessionsData,
    }),
    [isInitializing, isFetchingBalances, client, disconnect, connect, chainData, sessionsData],
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
