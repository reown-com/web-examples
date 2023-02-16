import Client from "@walletconnect/sign-client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";

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

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import IEthereumProvider from "@walletconnect/ethereum-provider";

import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { AccountBalances, apiGetAccountBalance } from "../helpers";
import { getAppMetadata, getSdkError } from "@walletconnect/utils";
import { getPublicKeysFromAccounts } from "../helpers/solana";
import { getRequiredNamespaces } from "../helpers/namespaces";
import { providers } from "ethers";
import "@web3modal/standalone";
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
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const prevRelayerValue = useRef<string>("");

  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [solanaPublicKeys, setSolanaPublicKeys] = useState<Record<string, PublicKey>>();
  const [chains, setChains] = useState<string[]>([]);
  const [relayerRegion, setRelayerRegion] = useState<string>(DEFAULT_RELAY_URL!);
  const [ethereumProvider, setEthereumProvider] = useState<IEthereumProvider>();
  const [web3Provider, setWeb3Provider] = useState<providers.Web3Provider>();

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
    async (pairing: any) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      console.log("connect, pairing topic is:", pairing?.topic);
      try {
        // const requiredNamespaces = getRequiredNamespaces([chains[0]]);
        const requiredChains = [parseInt(chains[0].split(":")[1])];
        const optionalChains = chains.slice(1).map(chain => parseInt(chain.split(":")[1]));

        console.log(
          "requiredNamespaces config for connect:",
          requiredChains,
          "optionalNamespaces config for connect:",
          optionalChains,
        );

        await ethereumProvider?.connect({
          chains: requiredChains,
          optionalChains: optionalChains,
        });
        const session = ethereumProvider?.session;
        console.log("Established session:", session);
        await onSessionConnected(session!);
      } catch (e) {
        console.error(e);
        // ignore rejection
      }
    },
    [chains, client, onSessionConnected],
  );

  const disconnect = useCallback(async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      await client.disconnect({
        topic: session.topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
    } catch (error) {
      console.error("SignClient.disconnect failed:", error);
    } finally {
      // Reset app state after disconnect.
      reset();
    }
  }, [client, session]);

  const _subscribeToEvents = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }

      _client.on("session_ping", args => {
        console.log("EVENT", "session_ping", args);
      });

      _client.on("session_event", args => {
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
    [onSessionConnected],
  );

  const _checkPersistedState = useCallback(
    async (_client: Client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // populates existing pairings to state
      setPairings(_client.pairing.getAll({ active: true }));
      console.log("RESTORED PAIRINGS: ", _client.pairing.getAll({ active: true }));

      if (typeof session !== "undefined") return;
      // populates (the last) existing session to state
      if (_client.session.length) {
        const lastKeyIndex = _client.session.keys.length - 1;
        const _session = _client.session.get(_client.session.keys[lastKeyIndex]);
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

      const provider = await EthereumProvider.init({
        projectId: DEFAULT_PROJECT_ID || "",
        chains: [1],
        metadata: getAppMetadata() || DEFAULT_APP_METADATA,
      });

      const _client = provider.signer.client;

      console.log("CREATED CLIENT: ", _client);
      console.log("relayerRegion ", relayerRegion);
      setEthereumProvider(provider);
      createWeb3Provider(provider);
      setClient(_client);
      prevRelayerValue.current = relayerRegion;
      await _subscribeToEvents(_client);
      await _checkPersistedState(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [_checkPersistedState, _subscribeToEvents, relayerRegion]);

  const createWeb3Provider = useCallback((ethereumProvider: IEthereumProvider) => {
    const web3Provider = new providers.Web3Provider(ethereumProvider);
    setWeb3Provider(web3Provider);
  }, []);

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
      web3Provider,
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
