import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import CosmosProvider from "@walletconnect/cosmos-provider";
import QRCodeModal from "@walletconnect/qrcode-modal";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from "../constants";
import { AccountBalances, ChainNamespaces, getAllChainNamespaces } from "../helpers";
import { apiGetChainNamespace, ChainsMap } from "caip-api";

/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Created | undefined;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chain: string;
  pairings: string[];
  accounts: string[];
  balances: AccountBalances;
  chainData: ChainNamespaces;
  onEnable: (chainId: string) => Promise<void>;
  cosmosProvider?: CosmosProvider;
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

  const [cosmosProvider, setCosmosProvider] = useState<CosmosProvider>();

  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCheckedPersistedSession, setHasCheckedPersistedSession] = useState(false);

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [chain, setChain] = useState<string>("");

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
    if (typeof cosmosProvider === "undefined") {
      throw new Error("cosmosProvider is not initialized");
    }
    await cosmosProvider.disconnect();
  }, [cosmosProvider]);

  const _subscribeToClientEvents = useCallback(async (_client: Client) => {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    _client.on(CLIENT_EVENTS.pairing.proposal, async (proposal: PairingTypes.Proposal) => {
      const { uri } = proposal.signal.params;
      console.log("EVENT", "QR Code Modal open");
      QRCodeModal.open(uri, () => {
        console.log("EVENT", "QR Code Modal closed");
      });
    });

    _client.on(CLIENT_EVENTS.pairing.created, async () => {
      setPairings(_client.pairing.topics);
    });

    _client.on(CLIENT_EVENTS.session.deleted, () => {
      console.log("EVENT", "session_deleted");
      resetApp();
    });
  }, []);

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const _client = await Client.init({
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
        projectId: DEFAULT_PROJECT_ID,
      });

      setClient(_client);
      await _subscribeToClientEvents(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [_subscribeToClientEvents]);

  const onEnable = useCallback(
    async (caipChainId: string) => {
      if (!client) {
        throw new ReferenceError("WalletConnect Client is not initialized.");
      }

      const chainId = caipChainId.split(":").pop();

      if (!chainId) {
        throw new Error("Could not derive chainId from CAIP chainId");
      }

      console.log("Enabling cosmosProvider for chainId: ", chainId);

      //  Create WalletConnect Provider
      const cosmosProvider = new CosmosProvider({
        chains: [chainId],
        client,
      });

      console.log(cosmosProvider);
      setCosmosProvider(cosmosProvider);

      try {
        await cosmosProvider.connect();
      } catch (error) {
        console.error(error);
        return;
      }

      const _accounts = cosmosProvider.accounts;
      const _session = await client.session.get(client.session.topics[0]);

      setAccounts(_accounts);
      setSession(_session);
      setChain(caipChainId);

      QRCodeModal.close();
    },
    [client],
  );

  const _checkForPersistedSession = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // populates existing pairings to state
      setPairings(_client.pairing.topics);
      if (typeof session !== "undefined") return;
      // populates existing session to state (assume only the top one)
      if (_client.session.topics.length) {
        const _session = await _client.session.get(_client.session.topics[0]);
        const [namespace, chainId] = _session.state.accounts[0].split(":");
        const caipChainId = `${namespace}:${chainId}`;
        onEnable(caipChainId);
      }
    },
    [session, onEnable],
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
    const getPersistedSession = async () => {
      if (client && !hasCheckedPersistedSession) {
        await _checkForPersistedSession(client);
        setHasCheckedPersistedSession(true);
      }
    };

    getPersistedSession();
  }, [client, _checkForPersistedSession, hasCheckedPersistedSession]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      chainData,
      onEnable,
      cosmosProvider,
    }),
    [
      pairings,
      isInitializing,
      balances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      chainData,
      onEnable,
      cosmosProvider,
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
