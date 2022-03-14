import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { ERROR } from "@walletconnect/utils";
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
import { apiGetChainNamespace, ChainsMap } from "caip-api";
import { PublicKey } from "@solana/web3.js";

import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from "../constants";
import { AccountBalances, ChainNamespaces, getAllChainNamespaces } from "../helpers";

/**
 * Types
 */

export enum SolanaRpcMethod {
  SOL_SIGN_TRANSACTION = "sol_signTransaction",
}
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Created | undefined;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chain: string;
  pairings: string[];
  publicKeys?: Record<string, PublicKey>;
  accounts: string[];
  balances: AccountBalances;
  chainData: ChainNamespaces;
  onEnable: (chainId: string) => Promise<void>;
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

  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCheckedPersistedSession, setHasCheckedPersistedSession] = useState(false);

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [publicKeys, setPublicKeys] = useState<Record<string, PublicKey>>();
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [chain, setChain] = useState<string>("");

  const resetApp = () => {
    setPairings([]);
    setSession(undefined);
    setBalances({});
    setPublicKeys(undefined);
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

  const onSessionConnected = useCallback(async (_session: SessionTypes.Settled) => {
    // Create a map of Solana address -> publicKey.
    const _publicKeys = _session.state.accounts.reduce(
      (publicKeysMap: Record<string, PublicKey>, account) => {
        const address = account.split(":").pop();
        if (!address) {
          throw new Error(`Could not derive Solana address from CAIP account: ${account}`);
        }
        publicKeysMap[address] = new PublicKey(address);
        return publicKeysMap;
      },
      {},
    );

    setSession(_session);
    setChain(_session.permissions.blockchain.chains[0]);
    setAccounts(_session.state.accounts);
    setPublicKeys(_publicKeys);
  }, []);

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

  const _subscribeToClientEvents = useCallback(
    async (_client: Client) => {
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

      _client.on(CLIENT_EVENTS.session.updated, (updatedSession: SessionTypes.Settled) => {
        console.log("EVENT", "session_updated");
        onSessionConnected(updatedSession);
      });

      _client.on(CLIENT_EVENTS.session.deleted, () => {
        console.log("EVENT", "session_deleted");
        resetApp();
      });
    },
    [onSessionConnected],
  );

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

      try {
        const _session = await client.connect({
          permissions: {
            blockchain: { chains: [caipChainId] },
            jsonrpc: { methods: [SolanaRpcMethod.SOL_SIGN_TRANSACTION] },
          },
        });
        onSessionConnected(_session);
      } catch (error) {
        console.error(error);
      } finally {
        QRCodeModal.close();
      }
    },
    [client, onSessionConnected],
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
        onSessionConnected(_session);
      }
    },
    [session, onSessionConnected],
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
      publicKeys,
      accounts,
      chain,
      client,
      session,
      disconnect,
      chainData,
      onEnable,
    }),
    [
      pairings,
      isInitializing,
      balances,
      publicKeys,
      accounts,
      chain,
      client,
      session,
      disconnect,
      chainData,
      onEnable,
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
