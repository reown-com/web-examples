import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import QRCodeModal from "@walletconnect/legacy-modal";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from "../constants";
import { AccountBalances, apiGetAccountAssets } from "../helpers";

/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Created | undefined;
  loading: boolean;
  fetching: boolean;
  chains: string[];
  pairings: string[];
  accounts: string[];
  balances: AccountBalances;
  setSession: any;
  setPairings: any;
  setAccounts: any;
  setChains: any;
  setFetching: any;
  setBalances: any;
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

  // UI State
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Other entities
  const [balances, setBalances] = useState<AccountBalances>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chains, setChains] = useState<string[]>([]);

  const subscribeToEvents = async (_client: Client) => {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    let _session = {} as SessionTypes.Settled;

    if (_client.session.topics.length) {
      _session = await _client.session.get(_client.session.topics[0]);
    }

    _client.on(CLIENT_EVENTS.pairing.proposal, async (proposal: PairingTypes.Proposal) => {
      const { uri } = proposal.signal.params;
      console.log("EVENT", "QR Code Modal open");
      QRCodeModal.open(uri, () => {
        console.log("EVENT", "QR Code Modal closed");
      });
    });

    _client.on(CLIENT_EVENTS.pairing.created, async (proposal: PairingTypes.Settled) => {
      if (typeof client === "undefined") return;
      setPairings(client.pairing.topics);
    });

    _client.on(CLIENT_EVENTS.session.deleted, (deletedSession: SessionTypes.Settled) => {
      if (deletedSession.topic !== _session?.topic) return;
      console.log("EVENT", "session_deleted");
      // TODO:
      // this.resetApp();
      window.location.reload();
    });
  };

  const checkPersistedState = async (_client: Client) => {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    // populates existing pairings to state
    setPairings(_client.pairing.topics);
    if (typeof session !== "undefined") return;
    // populates existing session to state (assume only the top one)
    if (_client.session.topics.length) {
      const session = await _client.session.get(_client.session.topics[0]);
      const chains = session.state.accounts.map(account =>
        account.split(":").slice(0, -1).join(":"),
      );
      setAccounts(session.state.accounts);
      setChains(chains);
      onSessionConnected(session);
    }
  };

  const onSessionConnected = async (incomingSession: SessionTypes.Settled) => {
    setSession(incomingSession);
    onSessionUpdate(incomingSession.state.accounts, incomingSession.permissions.blockchain.chains);
  };

  const onSessionUpdate = async (accounts: string[], chains: string[]) => {
    setChains(chains);
    setAccounts(accounts);
    await getAccountBalances(accounts);
  };

  const getAccountBalances = async (_accounts: string[]) => {
    setFetching(true);
    try {
      const arr = await Promise.all(
        _accounts.map(async account => {
          const [namespace, reference, address] = account.split(":");
          const chainId = `${namespace}:${reference}`;
          const assets = await apiGetAccountAssets(address, chainId);
          return { account, assets };
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
      setFetching(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const _client = await Client.init({
          logger: DEFAULT_LOGGER,
          relayUrl: DEFAULT_RELAY_URL,
          projectId: DEFAULT_PROJECT_ID,
        });
        setClient(_client);
        await subscribeToEvents(_client);
        await checkPersistedState(_client);
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <ClientContext.Provider
      value={{
        pairings,
        fetching,
        loading,
        balances,
        accounts,
        chains,
        client,
        session,
        setSession,
        setPairings,
        setAccounts,
        setChains,
        setFetching,
        setBalances,
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
