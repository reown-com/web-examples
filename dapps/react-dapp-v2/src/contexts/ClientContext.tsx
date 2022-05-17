import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, ProposalTypes, SessionTypes } from "@walletconnect/types";
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
import { PublicKey } from "@solana/web3.js";

import {
  DEFAULT_APP_METADATA,
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  DEFAULT_SOLANA_METHODS,
} from "../constants";
import { AccountBalances, apiGetAccountBalance } from "../helpers";
import { ERROR, getAppMetadata } from "@walletconnect/utils";
import { getPublicKeysFromAccounts } from "../helpers/solana";

const USE_DEBUG_PEER_CLIENT = process.env.NODE_ENV !== "production";

/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Struct | undefined;
  connect: (pairing?: { topic: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chains: string[];
  pairings: string[];
  accounts: string[];
  solanaPublicKeys?: Record<string, PublicKey>;
  balances: AccountBalances;
  isFetchingBalances: boolean;
  setChains: any;
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
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [solanaPublicKeys, setSolanaPublicKeys] = useState<Record<string, PublicKey>>();
  const [chains, setChains] = useState<string[]>([]);

  // FIXME: remove debug peer
  const [debugPeerClient, setDebugPeerClient] = useState<Client>();

  const reset = () => {
    setPairings([]);
    setSession(undefined);
    setBalances({});
    setAccounts([]);
    setChains([]);
  };

  const getAccountBalances = async (_accounts: string[]) => {
    setIsFetchingBalances(true);
    try {
      const arr = await Promise.all(
        _accounts.map(async account => {
          const [namespace, reference, address] = account.split(":");
          const chainId = `${namespace}:${reference}`;
          const assets = await apiGetAccountBalance(address, chainId);
          return { account, assets: [assets] };
        }),
      );

      const balances: AccountBalances = {};
      arr.forEach(({ account, assets }) => {
        balances[account] = assets;
      });
      setBalances(balances);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingBalances(false);
    }
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
            return Object.values(DEFAULT_EIP155_METHODS);
          case "cosmos":
            return Object.values(DEFAULT_COSMOS_METHODS);
          case "solana":
            return Object.values(DEFAULT_SOLANA_METHODS);
          default:
            throw new Error(`No default methods for namespace: ${namespace}`);
        }
      })
      .flat();

    return supportedMethods;
  };

  const onSessionConnected = useCallback(async (_session: SessionTypes.Struct) => {
    const allNamespaceAccounts = Object.values(_session.namespaces)
      .map(namespace => namespace.accounts)
      .flat();
    const allNamespaceChains = Object.keys(_session.namespaces);

    setSession(_session);
    setChains(allNamespaceChains);
    setAccounts(allNamespaceAccounts);
    setSolanaPublicKeys(getPublicKeysFromAccounts(allNamespaceAccounts));
    await getAccountBalances(allNamespaceAccounts);
  }, []);

  const connect = useCallback(
    async (pairing?: { topic: string }) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      console.log("connect, pairing is:", pairing);
      try {
        const supportedNamespaces = getSupportedNamespaces();
        const methods = getSupportedMethods(supportedNamespaces);

        console.log("SELECTED CHAINS:", chains);

        // TODO: remove hardcoded chains here
        const { uri, approval } = await client.connect({
          requiredNamespaces: {
            eip155: {
              methods,
              chains: ["eip155:1"],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        });

        if (!uri) {
          throw new Error("Could not get URI from `Client.connect`");
        }

        QRCodeModal.open(uri, () => {
          console.log("EVENT", "QR Code Modal closed");
        });

        // TODO: remove local debug pairing
        if (debugPeerClient) {
          console.warn("DEBUG: auto-pairing to local `debugPairClient`...");
          const pairing = await debugPeerClient!.pair({ uri });
          console.log("pairing:", pairing);
        }
        // -----

        const session = await approval();

        console.log("session:", session);

        onSessionConnected(session);
      } catch (e) {
        console.error(e);
        // ignore rejection
      }

      // close modal in case it was open
      QRCodeModal.close();
    },
    [chains, client, debugPeerClient, onSessionConnected, getSupportedNamespaces],
  );

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
    // Reset app state after disconnect.
    reset();
  }, [client, session]);

  const _subscribeToEvents = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

      // TODO: update session based on the update.
      _client.on(CLIENT_EVENTS.session_update, updatedSession => {
        console.log("EVENT", "session_update");
        console.log(updatedSession);

        // onSessionConnected(updatedSession);
      });

      _client.on(CLIENT_EVENTS.session_delete, () => {
        console.log("EVENT", "session_delete");
        reset();
      });
    },
    [
      /*onSessionConnected*/
    ],
  );

  const _checkPersistedState = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // populates existing pairings to state
      // setPairings(_client.pairing.topics);
      if (typeof session !== "undefined") return;
      // populates existing session to state (assume only the top one)
      if (_client.session.length) {
        const _session = _client.session.get(_client.session.keys[0]);
        console.log("RESTORED SESSION:", _session);

        await onSessionConnected(_session);
        return _session;
      }
    },
    [session, onSessionConnected],
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const _client = await Client.init({
        logger: DEFAULT_LOGGER,
        relayUrl: DEFAULT_RELAY_URL,
        projectId: DEFAULT_PROJECT_ID,
        metadata: getAppMetadata() || DEFAULT_APP_METADATA,
      });

      console.log("CREATED CLIENT: ", _client);
      setClient(_client);
      await _subscribeToEvents(_client);

      // TODO: re-enable session restore from persistence
      // const _persistedSession = await _checkPersistedState(_client);

      // if (_persistedSession) {
      //   return;
      // }

      // TODO: remove debug peer client.
      if (USE_DEBUG_PEER_CLIENT) {
        const _debugPeerClient = await Client.init({
          logger: DEFAULT_LOGGER,
          relayUrl: DEFAULT_RELAY_URL,
          projectId: DEFAULT_PROJECT_ID,
          metadata: {
            name: "Debug Peer Client (Responder)",
            description: "",
            url: "https://walletconnect.com",
            icons: ["https://avatars.githubusercontent.com/u/37784886"],
          },
        });

        console.log("CREATED DEBUG PEER: ", _debugPeerClient);

        _debugPeerClient.on("session_proposal", async proposal => {
          console.log("session_proposal", proposal);
          try {
            const { acknowledged } = await _debugPeerClient.approve({
              id: proposal.id,
              namespaces: {
                eip155: {
                  accounts: ["eip155:1:0x3c582121909DE92Dc89A36898633C1aE4790382b"],
                  methods: proposal.requiredNamespaces["eip155"].methods,
                  events: proposal.requiredNamespaces["eip155"].events,
                },
              },
            });
            await acknowledged();
          } catch (err) {
            throw err;
          }
        });
        _debugPeerClient.on(CLIENT_EVENTS.session_delete, () => {
          console.log("PEER EVENT", "session_delete");
        });

        setDebugPeerClient(_debugPeerClient);
      }
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [_checkPersistedState, _subscribeToEvents]);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client, createClient]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      solanaPublicKeys,
      chains,
      client,
      session,
      connect,
      disconnect,
      setChains,
    }),
    [
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      solanaPublicKeys,
      chains,
      client,
      session,
      connect,
      disconnect,
      setChains,
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
