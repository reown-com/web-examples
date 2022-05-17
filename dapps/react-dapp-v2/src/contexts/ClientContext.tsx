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
    setSession(_session);
    // FIXME:
    // setChains(_session.permissions.blockchain.chains);
    // setAccounts(_session.accounts);
    // setSolanaPublicKeys(getPublicKeysFromAccounts(_session.state.accounts));
    // await getAccountBalances(_session.state.accounts);
  }, []);

  const connect = useCallback(
    async (pairing?: { topic: string }) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      console.log("connect", pairing);
      try {
        const supportedNamespaces = getSupportedNamespaces();
        const methods = getSupportedMethods(supportedNamespaces);

        // TODO: remove hardcoded config options here
        const { uri, approval } = await client.connect({
          requiredNamespaces: {
            eip155: {
              methods: [
                "eth_sendTransaction",
                "eth_signTransaction",
                "personal_sign",
                "eth_signTypedData",
              ],
              chains: ["eip155:1"],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        });

        console.log("URI: ", uri);

        if (!uri) {
          throw new Error("Could not get URI from `client.connect`");
        }

        QRCodeModal.open(uri, () => {
          console.log("EVENT", "QR Code Modal closed");
        });

        const session = await approval();

        onSessionConnected(session);
      } catch (e) {
        console.error(e);
        // ignore rejection
      }

      // close modal in case it was open
      QRCodeModal.close();
    },
    [chains, client, onSessionConnected, getSupportedNamespaces],
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
  }, [client, session]);

  const _subscribeToEvents = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

      // FIXME: when is this triggered now?
      _client.on(CLIENT_EVENTS.session_proposal, async (proposal: any) => {
        console.log("CLIENT_EVENTS.session_proposal", proposal);
        // const { uri } = proposal.signal.params;
        // console.log("EVENT", "QR Code Modal open");
        // QRCodeModal.open(uri, () => {
        //   console.log("EVENT", "QR Code Modal closed");
        // });
      });

      // FIXME:
      // _client.on(CLIENT_EVENTS.pairing.created, async () => {
      //   setPairings(_client.pairing.topics);
      // });

      // FIXME:
      _client.on(CLIENT_EVENTS.session_update, updatedSession => {
        console.log("EVENT", "session_updated");
        console.log(updatedSession);

        // onSessionConnected(updatedSession);
      });

      _client.on(CLIENT_EVENTS.session_delete, () => {
        console.log("EVENT", "session_deleted");
        reset();
      });
    },
    [onSessionConnected],
  );

  // FIXME:
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

      console.log("CREATED CLIENT: ", _client);

      setClient(_client);
      await _subscribeToEvents(_client);
      // await _checkPersistedState(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [/*_checkPersistedState,*/ _subscribeToEvents]);

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
