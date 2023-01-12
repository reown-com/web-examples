import Client from "@walletconnect/sign-client";
import { DappClient as PushDappClient } from "@walletconnect/push-client";
import { Core } from "@walletconnect/core";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { Web3Modal } from "@web3modal/standalone";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { PublicKey } from "@solana/web3.js";

import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { AccountBalances, apiGetAccountBalance } from "../helpers";
import {
  getAccountsFromNamespaces,
  getAddressesFromAccounts,
  getAppMetadata,
  getSdkError,
} from "@walletconnect/utils";
import { getPublicKeysFromAccounts } from "../helpers/solana";
import { getRequiredNamespaces } from "../helpers/namespaces";
import { PushClientTypes } from "@walletconnect/push-client/dist/types/types";

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
  relayerRegion: string;
  pairings: PairingTypes.Struct[];
  accounts: string[];
  solanaPublicKeys?: Record<string, PublicKey>;
  balances: AccountBalances;
  isFetchingBalances: boolean;
  setChains: any;
  setRelayerRegion: any;
  pushClient: PushDappClient | undefined;
  activePushSubscription: PushClientTypes.PushSubscription | undefined;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

/**
 * Web3Modal Config
 */
const web3Modal = new Web3Modal({
  projectId: DEFAULT_PROJECT_ID,
  themeMode: "light",
});

/**
 * Provider
 */
export function ClientContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const prevRelayerValue = useRef<string>("");

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [solanaPublicKeys, setSolanaPublicKeys] =
    useState<Record<string, PublicKey>>();
  const [chains, setChains] = useState<string[]>([]);
  const [relayerRegion, setRelayerRegion] = useState<string>(
    DEFAULT_RELAY_URL!
  );

  // PushClient state
  const [pushClient, setPushClient] = useState<PushDappClient>();
  const [activePushSubscription, setActivePushSubscription] =
    useState<PushClientTypes.PushSubscription>();

  const reset = () => {
    setSession(undefined);
    setBalances({});
    setAccounts([]);
    setChains([]);
    setRelayerRegion(DEFAULT_RELAY_URL!);
  };

  const getAccountBalances = async (_accounts: string[]) => {
    setIsFetchingBalances(true);
    try {
      const arr = await Promise.all(
        _accounts.map(async (account) => {
          const [namespace, reference, address] = account.split(":");
          const chainId = `${namespace}:${reference}`;
          const assets = await apiGetAccountBalance(address, chainId);
          return { account, assets: [assets] };
        })
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

  const onSessionConnected = useCallback(
    async (_session: SessionTypes.Struct) => {
      const allNamespaceAccounts = Object.values(_session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(_session.namespaces);

      setSession(_session);
      setChains(allNamespaceChains);
      setAccounts(allNamespaceAccounts);
      setSolanaPublicKeys(getPublicKeysFromAccounts(allNamespaceAccounts));
      await getAccountBalances(allNamespaceAccounts);
    },
    []
  );

  const requestPushSubscription = useCallback(
    async (_session: SessionTypes.Struct) => {
      if (typeof pushClient === "undefined") {
        throw new Error("PushDappClient is not initialized");
      }
      const pairings = pushClient.core.pairing.getPairings();
      const latestPairing = pairings[pairings.length - 1];
      console.log("latestPairing", latestPairing);

      const accounts = getAccountsFromNamespaces(_session.namespaces);

      console.log("[PUSH DEMO] Sending push request with params:", {
        account: accounts[0],
        pairingTopic: latestPairing.topic,
      });

      const id = await pushClient.request({
        account: accounts[0],
        pairingTopic: latestPairing.topic,
      });
      console.log("push.request id:", id);
      console.log(pushClient.requests.getAll());
    },
    [pushClient]
  );

  const connect = useCallback(
    async (pairing: any) => {
      if (typeof client === "undefined") {
        throw new Error("SignClient is not initialized");
      }
      console.log("connect, pairing topic is:", pairing?.topic);
      try {
        const requiredNamespaces = getRequiredNamespaces(chains);
        console.log(
          "requiredNamespaces config for connect:",
          requiredNamespaces
        );

        const { uri, approval } = await client.connect({
          pairingTopic: pairing?.topic,
          requiredNamespaces,
        });

        // Open QRCode modal if a URI was returned (i.e. we're not connecting an existing pairing).
        if (uri) {
          // Create a flat array of all requested chains across namespaces.
          const standaloneChains = Object.values(requiredNamespaces)
            .map((namespace) => namespace.chains)
            .flat();

          web3Modal.openModal({ uri, standaloneChains });
        }

        const session = await approval();
        console.log("Established session:", session);
        await onSessionConnected(session);
        // Update known pairings after session is connected.
        setPairings(client.pairing.getAll({ active: true }));

        // Immediately request push subscription after session is connected.
        await requestPushSubscription(session);
      } catch (e) {
        console.error(e);
        // ignore rejection
      } finally {
        // close modal in case it was open
        web3Modal.closeModal();
      }
    },
    [chains, client, onSessionConnected, requestPushSubscription]
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
      reason: getSdkError("USER_DISCONNECTED"),
    });
    // Reset app state after disconnect.
    reset();
  }, [client, session]);

  const _subscribeToEvents = useCallback(
    async (_client: Client, _pushClient: PushDappClient) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof _pushClient === "undefined") {
        throw new Error("PushDappClient is not initialized");
      }

      /**
       * SignClient Events
       */
      _client.on("session_ping", (args) => {
        console.log("EVENT", "session_ping", args);
      });

      _client.on("session_event", (args) => {
        console.log("EVENT", "session_event", args);
      });

      _client.on("session_update", ({ topic, params }) => {
        console.log("EVENT", "session_update", { topic, params });
        const { namespaces } = params;
        const _session = _client.session.get(topic);
        const updatedSession = { ..._session, namespaces };
        onSessionConnected(updatedSession);
      });

      _client.on("session_delete", () => {
        console.log("EVENT", "session_delete");
        reset();
      });

      /**
       * PushDappClient Events
       */
      _pushClient.on("push_response", (event) => {
        console.log("EVENT", "push_response", event);
        if (event.params.error) {
          console.error(event.params.error);
        } else {
          setActivePushSubscription(event.params.subscription);
        }
      });
    },
    [onSessionConnected]
  );

  const _checkPersistedState = useCallback(
    async (_client: Client, _pushClient: PushDappClient) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof _pushClient === "undefined") {
        throw new Error("PushDappClient is not initialized");
      }

      /**
       * Restore SignClient state.
       */

      // populates existing pairings to state
      setPairings(_client.pairing.getAll({ active: true }));
      console.log(
        "RESTORED PAIRINGS: ",
        _client.pairing.getAll({ active: true })
      );

      // populates (the last) existing session to state
      if (typeof session === "undefined" && _client.session.length) {
        const lastKeyIndex = _client.session.keys.length - 1;
        const _session = _client.session.get(
          _client.session.keys[lastKeyIndex]
        );
        console.log("RESTORED SESSION:", _session);
        await onSessionConnected(_session);
      }

      /**
       * Restore PushDappClient state.
       */
      const pushSubscriptions = Object.values(
        _pushClient.getActiveSubscriptions()
      );

      if (pushSubscriptions.length) {
        const latestPushSubscription =
          pushSubscriptions[pushSubscriptions.length - 1];
        setActivePushSubscription(latestPushSubscription);
        console.log(
          "[PUSH DEMO] RESTORED LATEST PUSH SUBSCRIPTION: ",
          latestPushSubscription
        );
      }
    },
    [session, onSessionConnected]
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);

      const core = new Core({
        logger: DEFAULT_LOGGER,
        relayUrl: relayerRegion,
        projectId: DEFAULT_PROJECT_ID,
      });

      console.log("CREATED SHARED CORE: ", core);

      const _client = await Client.init({
        core,
        metadata: getAppMetadata() || DEFAULT_APP_METADATA,
      });

      console.log("CREATED SIGN CLIENT: ", _client);
      console.log("relayerRegion ", relayerRegion);
      setClient(_client);
      prevRelayerValue.current = relayerRegion;

      // Push Dapp Client setup
      const _pushClient = await PushDappClient.init({
        core,
        metadata: DEFAULT_APP_METADATA,
      });
      console.log("CREATED PUSH CLIENT:", _pushClient);
      setPushClient(_pushClient);

      await _subscribeToEvents(_client, _pushClient);
      await _checkPersistedState(_client, _pushClient);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [_checkPersistedState, _subscribeToEvents, relayerRegion]);

  useEffect(() => {
    if (!client || prevRelayerValue.current !== relayerRegion) {
      createClient();
    }
  }, [client, createClient, relayerRegion]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      solanaPublicKeys,
      chains,
      relayerRegion,
      client,
      session,
      connect,
      disconnect,
      setChains,
      setRelayerRegion,
      pushClient,
      activePushSubscription,
    }),
    [
      pairings,
      isInitializing,
      balances,
      isFetchingBalances,
      accounts,
      solanaPublicKeys,
      chains,
      relayerRegion,
      client,
      session,
      connect,
      disconnect,
      setChains,
      setRelayerRegion,
      pushClient,
      activePushSubscription,
    ]
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
    throw new Error(
      "useWalletConnectClient must be used within a ClientContextProvider"
    );
  }
  return context;
}
