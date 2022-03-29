import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
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
import Web3 from "web3";
import { apiGetChainNamespace, ChainsMap } from "caip-api";

import {
  DEFAULT_INFURA_ID,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../constants";
import { AccountBalances, ChainNamespaces, getAllChainNamespaces } from "../helpers";
import { utils } from "ethers";

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
  isFetchingBalances: boolean;
  chainData: ChainNamespaces;
  onEnable: (chainId: string) => Promise<void>;
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
  const [pairings, setPairings] = useState<string[]>([]);
  const [session, setSession] = useState<SessionTypes.Created>();

  const [ethereumProvider, setEthereumProvider] = useState<EthereumProvider>();
  const [web3Provider, setWeb3Provider] = useState<Web3>();

  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
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
    if (typeof ethereumProvider === "undefined") {
      throw new Error("ethereumProvider is not initialized");
    }
    await ethereumProvider.disconnect();
  }, [ethereumProvider]);

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

    _client.on(CLIENT_EVENTS.session.updated, (updatedSession: SessionTypes.Settled) => {
      console.log("EVENT", "session_updated");
      setAccounts(updatedSession.state.accounts);
      setSession(updatedSession);
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

      console.log("Enabling EthereumProvider for chainId: ", chainId);

      const customRpcs = Object.keys(chainData.eip155).reduce(
        (rpcs: Record<string, string>, chainId) => {
          rpcs[chainId] = chainData.eip155[chainId].rpc[0];
          return rpcs;
        },
        {},
      );

      //  Create WalletConnect Provider
      const ethereumProvider = new EthereumProvider({
        chainId: Number(chainId),
        rpc: {
          infuraId: DEFAULT_INFURA_ID,
          custom: customRpcs,
        },
        client,
      });

      const web3Provider = new Web3(ethereumProvider);

      console.log(ethereumProvider);
      console.log(web3Provider);

      setEthereumProvider(ethereumProvider);
      setWeb3Provider(web3Provider);

      const _accounts = await ethereumProvider.enable();
      const _session = await client.session.get(client.session.topics[0]);

      setAccounts(_accounts);
      setSession(_session);
      setChain(caipChainId);

      try {
        setIsFetchingBalances(true);
        const _balances = await Promise.all(
          _accounts.map(async account => {
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

      QRCodeModal.close();
    },
    [client, chainData.eip155],
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
      isFetchingBalances,
      accounts,
      chain,
      client,
      session,
      disconnect,
      chainData,
      onEnable,
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
      chainData,
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
