import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { AppKit, CaipNetwork, CaipNetworkId } from "@reown/appkit";
// @ts-expect-error - our "moduleResolution" doesn't like this
import { createAppKit } from "@reown/appkit/core";
import { defineChain } from "@reown/appkit/networks";
import {
  IUniversalProvider,
  NamespaceConfig,
  UniversalProvider,
} from "@walletconnect/universal-provider";
import { RELAYER_EVENTS } from "@walletconnect/core";
import toast from "react-hot-toast";

import { PublicKey } from "@solana/web3.js";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAppMetadata, getSdkError } from "@walletconnect/utils";
import {
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { AccountBalances, apiGetAccountBalance } from "../helpers";
import { getRequiredNamespaces } from "../helpers/namespaces";
import { getPublicKeysFromAccounts } from "../helpers/solana";

/**
 * Types
 */

type Client = IUniversalProvider["client"];
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
  origin: string;
  setAccounts: any;
}

/**
 * Context
 */
export const ClientContext = createContext<IContext>({} as IContext);

let creatingClient: boolean = false;
let appkit: AppKit | undefined;
/**
 * Provider
 */
export function ClientContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [client, setClient] = useState<Client>();
  const [provider, setProvider] = useState<IUniversalProvider>();
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
  const [origin, setOrigin] = useState<string>(getAppMetadata().url);
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

  useMemo(() => {
    if (!accounts.length) return;
    getAccountBalances(accounts);
  }, [accounts]);

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

  const mapCaipIdToAppKitCaipNetwork = (caipId: CaipNetworkId): CaipNetwork => {
    const [namespace, chainId] = caipId.split(":");
    const chain = defineChain({
      id: chainId,
      caipNetworkId: caipId,
      chainNamespace: namespace as CaipNetwork["chainNamespace"],
      name: "",
      nativeCurrency: {
        name: "",
        symbol: "",
        decimals: 8,
      },
      rpcUrls: {
        default: { http: ["https://rpc.walletconnect.org/v1"] },
      },
    });

    return chain as CaipNetwork;
  };

  const connect = useCallback(
    async (pairing: any) => {
      if (typeof provider === "undefined" || typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      console.log("connect, pairing topic is:", pairing?.topic);
      try {
        const namespacesToRequest = getRequiredNamespaces(chains);

        appkit?.open();

        appkit?.subscribeState((state: { open: boolean }) => {
          // the modal was closed so reject the promise
          if (!state.open && !provider.session) {
            throw new Error("Connection request reset. Please try again.");
          }
        });

        provider.namespaces = undefined;
        const session = await provider.connect({
          pairingTopic: pairing?.topic,
          optionalNamespaces: namespacesToRequest as NamespaceConfig,
        });

        if (!session) {
          throw new Error("Session is not connected");
        }

        console.log("Established session:", session);
        await onSessionConnected(session);
        // Update known pairings after session is connected.
        setPairings(client.pairing.getAll({ active: true }));
      } catch (e) {
        console.error(e);
        toast.error((e as Error).message, {
          position: "bottom-left",
        });
        throw e;
      } finally {
        // close modal in case it was open
        appkit?.close();
      }
    },
    [chains, client, onSessionConnected, provider]
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
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

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
    },
    [onSessionConnected]
  );

  const _checkPersistedState = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // populates existing pairings to state
      setPairings(_client.pairing.getAll({ active: true }));
      console.log(
        "RESTORED PAIRINGS: ",
        _client.pairing.getAll({ active: true })
      );

      if (typeof session !== "undefined") return;
      // populates (the last) existing session to state
      if (_client.session.length) {
        const lastKeyIndex = _client.session.keys.length - 1;
        const _session = _client.session.get(
          _client.session.keys[lastKeyIndex]
        );
        console.log("RESTORED SESSION:", _session);
        await onSessionConnected(_session);
        return _session;
      }
    },
    [session, onSessionConnected]
  );

  const _logClientId = useCallback(async (_client: Client) => {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    try {
      const clientId = await _client.core.crypto.getClientId();
      console.log("WalletConnect ClientID: ", clientId);
      localStorage.setItem("WALLETCONNECT_CLIENT_ID", clientId);
    } catch (error) {
      console.error(
        "Failed to set WalletConnect clientId in localStorage: ",
        error
      );
    }
  }, []);

  const createModal = useCallback((provider: IUniversalProvider) => {
    if (appkit) return;
    const networks = ["eip155:1"].map((caipId) =>
      mapCaipIdToAppKitCaipNetwork(caipId as CaipNetworkId)
    );
    appkit = createAppKit({
      projectId: DEFAULT_PROJECT_ID,
      themeMode: "dark",
      manualWCControl: true,
      universalProvider: provider,
      networks: [networks[0], ...networks],
      metadata: {
        name: "React App",
        description: "App to test WalletConnect network",
        url: location.origin,
        icons: [],
      },
      showWallets: true,
      enableEIP6963: false, // Disable 6963 by default
      enableInjected: false, // Disable injected by default
      enableCoinbase: true, // Default to true
      enableWalletConnect: true, // Default to true,
      features: {
        email: false,
        socials: false,
      },
    });
  }, []);

  const createClient = useCallback(async () => {
    try {
      if (creatingClient) return;
      creatingClient = true;
      setIsInitializing(true);
      const claimedOrigin =
        localStorage.getItem("wallet_connect_dapp_origin") || origin;
      const provider = await UniversalProvider.init({
        logger: DEFAULT_LOGGER,
        relayUrl: relayerRegion,
        projectId: DEFAULT_PROJECT_ID,
        metadata: {
          name: "React App",
          description: "App to test WalletConnect network",
          url: claimedOrigin,
          icons: [],
        },
      });

      createModal(provider);

      const _client = provider.client;

      if (claimedOrigin === "unknown") {
        //@ts-expect-error - private property
        _client.core.verify.verifyUrlV3 = "0xdeafbeef";
        console.log("verify", _client.core.verify);
      }
      setProvider(provider);
      setClient(_client);
      setOrigin(_client.metadata.url);
      console.log("metadata url:", _client.metadata);

      prevRelayerValue.current = relayerRegion;
      await _subscribeToEvents(_client);
      await _checkPersistedState(_client);
      await _logClientId(_client);
    } catch (err) {
      throw err;
    } finally {
      creatingClient = false;
      setIsInitializing(false);
    }
  }, [
    origin,
    relayerRegion,
    createModal,
    _subscribeToEvents,
    _checkPersistedState,
    _logClientId,
  ]);

  useEffect(() => {
    const claimedOrigin =
      localStorage.getItem("wallet_connect_dapp_origin") || origin;
    console.log("claimedOrigin:", claimedOrigin);
    let interval: NodeJS.Timer;
    // simulates `UNKNOWN` validation by removing the verify iframe thus preventing POST message
    if (claimedOrigin === "unknown") {
      //The interval is needed as Verify tries to init new iframe(with different urls) multiple times
      interval = setInterval(
        () => document.getElementById("verify-api")?.remove(),
        500
      );
    }
    return () => {
      clearInterval(interval);
    };
  }, [origin]);

  useEffect(() => {
    if (!client) {
      createClient();
    } else if (
      prevRelayerValue.current &&
      prevRelayerValue.current !== relayerRegion
    ) {
      client.core.relayer.restartTransport(relayerRegion);
      prevRelayerValue.current = relayerRegion;
    }
  }, [createClient, relayerRegion, client]);

  useEffect(() => {
    if (!client) return;
    client.core.relayer.on(RELAYER_EVENTS.connect, () => {
      toast.success("Network connection is restored!", {
        position: "bottom-left",
      });
    });

    client.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
      toast.error("Network connection lost.", {
        position: "bottom-left",
      });
    });
  }, [client]);

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
      origin,
      setAccounts,
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
      origin,
      setAccounts,
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
