import React, { useEffect, useState } from "react";

import Client, { CLIENT_EVENTS } from "@walletconnect/client";
import QRCodeModal from "@walletconnect/legacy-modal";
import { PairingTypes, SessionTypes } from "@walletconnect/types";
import { ERROR, getAppMetadata } from "@walletconnect/utils";
import * as encoding from "@walletconnect/encoding";
import { apiGetChainNamespace, ChainsMap } from "caip-api";
import { formatDirectSignDoc, stringifySignDocValues } from "cosmos-wallet";
import { BigNumber } from "ethers";

import Banner from "./components/Banner";
import Blockchain from "./components/Blockchain";
import Column from "./components/Column";
import Header from "./components/Header";
import Modal from "./components/Modal";
import {
  DEFAULT_APP_METADATA,
  DEFAULT_MAIN_CHAINS,
  DEFAULT_LOGGER,
  DEFAULT_EIP155_METHODS,
  DEFAULT_COSMOS_METHODS,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  DEFAULT_TEST_CHAINS,
} from "./constants";
import {
  apiGetAccountAssets,
  AccountAction,
  eip712,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
  AccountBalances,
  formatTestTransaction,
  ChainNamespaces,
  setInitialStateTestnet,
  getInitialStateTestnet,
  getAllChainNamespaces,
} from "./helpers";
import Toggle from "./components/Toggle";
import RequestModal from "./modals/RequestModal";
import PairingModal from "./modals/PairingModal";
import PingModal from "./modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SConnectButton,
  SContent,
  SLanding,
  SLayout,
  SToggleContainer,
} from "./components/app";

interface FormattedRpcResponse {
  method: string;
  address: string;
  valid: boolean;
  result: string;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isTestnet, setIsTestnet] = useState(getInitialStateTestnet());

  const [modal, setModal] = useState("");
  const [client, setClient] = useState<Client>();
  const [uri, setUri] = useState("");
  const [session, setSession] = useState<SessionTypes.Created>();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [pairings, setPairings] = useState<string[]>([]);
  const [result, setResult] = useState<{
    method: string;
    valid: boolean;
  } | null>();
  const [balances, setBalances] = useState<AccountBalances>({});
  const [chainData, setChainData] = useState<ChainNamespaces>({});
  const [chains, setChains] = useState<string[]>([]);

  const closeModal = () => setModal("");
  const openPairingModal = () => setModal("pairing");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");

  const init = async () => {
    try {
      setLoading(true);
      await loadChainData();

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

  useEffect(() => {
    init();
  }, []);

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
      setUri(uri);
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

  const connect = async (pairing?: { topic: string }) => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    console.log("connect", pairing);
    if (modal === "pairing") {
      closeModal();
    }
    try {
      const supportedNamespaces: string[] = [];
      chains.forEach(chainId => {
        const [namespace] = chainId.split(":");
        if (!supportedNamespaces.includes(namespace)) {
          supportedNamespaces.push(namespace);
        }
      });
      const methods: string[] = supportedNamespaces
        .map(namespace => {
          switch (namespace) {
            case "eip155":
              return DEFAULT_EIP155_METHODS;
            case "cosmos":
              return DEFAULT_COSMOS_METHODS;
            default:
              throw new Error(`No default methods for namespace: ${namespace}`);
          }
        })
        .flat();
      const session = await client.connect({
        metadata: getAppMetadata() || DEFAULT_APP_METADATA,
        pairing,
        permissions: {
          blockchain: {
            chains,
          },
          jsonrpc: {
            methods,
          },
        },
      });

      onSessionConnected(session);
    } catch (e) {
      console.error(e);
      // ignore rejection
    }

    // close modal in case it was open
    QRCodeModal.close();
  };

  const disconnect = async () => {
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
  };

  const onConnect = () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (client.pairing.topics.length) {
      return openPairingModal();
    }
    connect();
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

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      setPending(true);
      openPingModal();

      let valid = false;

      try {
        await client.session.ping(session.topic);
        valid = true;
      } catch (e) {
        valid = false;
      }

      // display result
      setResult({
        method: "ping",
        valid,
      });
    } catch (e) {
      console.error(e);
      setResult(null);
    } finally {
      setPending(false);
    }
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

  // ----- EVM RPC -----

  const createJsonRpcRequestHandler =
    (rpcRequest: (...requestArgs: [any]) => Promise<FormattedRpcResponse>) =>
    async (chainId: string) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof session === "undefined") {
        throw new Error("Session is not connected");
      }

      try {
        setPending(true);
        const result = await rpcRequest(chainId);
        setResult(result);
      } catch (err) {
        console.error(err);
        setResult(null);
      } finally {
        setPending(false);
      }
    };

  const testSendTransaction = createJsonRpcRequestHandler(async (chainId: string) => {
    // get ethereum address
    const account = accounts.find(account => account.startsWith(chainId));
    if (account === undefined) throw new Error("Account is not found");
    const address = account.split(":").pop();
    if (address === undefined) throw new Error("Address is invalid");

    // open modal
    openRequestModal();

    const tx = await formatTestTransaction(account);

    const balance = BigNumber.from(balances[account][0].balance || "0");
    if (balance.lt(BigNumber.from(tx.gasPrice).mul(tx.gasLimit))) {
      return {
        method: "eth_sendTransaction",
        address,
        valid: false,
        result: "Insufficient funds for intrinsic transaction cost",
      };
    }

    const result: string = await client!.request({
      topic: session!.topic,
      chainId,
      request: {
        method: "eth_sendTransaction",
        params: [tx],
      },
    });

    // format displayed result
    return {
      method: "eth_sendTransaction",
      address,
      valid: true,
      result,
    };
  });

  const testSignPersonalMessage = createJsonRpcRequestHandler(async (chainId: string) => {
    // test message
    const message = `My email is john@doe.com - ${Date.now()}`;

    // encode message (hex)
    const hexMsg = encoding.utf8ToHex(message, true);

    // get ethereum address
    const account = accounts.find(account => account.startsWith(chainId));
    if (account === undefined) throw new Error("Account is not found");
    const address = account.split(":").pop();
    if (address === undefined) throw new Error("Address is invalid");

    // personal_sign params
    const params = [hexMsg, address];

    // open modal
    openRequestModal();

    // send message
    const result: string = await client!.request({
      topic: session!.topic,
      chainId,
      request: {
        method: "personal_sign",
        params,
      },
    });

    //  split chainId
    const [namespace, reference] = chainId.split(":");

    const targetChainData = chainData[namespace][reference];

    if (typeof targetChainData === "undefined") {
      throw new Error(`Missing chain data for chainId: ${chainId}`);
    }

    const rpcUrl = targetChainData.rpc[0];

    // verify signature
    const hash = hashPersonalMessage(message);
    const valid = await verifySignature(address, result, hash, rpcUrl);

    // format displayed result
    return {
      method: "personal_sign",
      address,
      valid,
      result,
    };
  });

  const testSignTypedData = createJsonRpcRequestHandler(async (chainId: string) => {
    // test message
    const message = JSON.stringify(eip712.example);

    // get ethereum address
    const account = accounts.find(account => account.startsWith(chainId));
    if (account === undefined) throw new Error("Account is not found");
    const address = account.split(":").pop();
    if (address === undefined) throw new Error("Address is invalid");

    // eth_signTypedData params
    const params = [address, message];

    // open modal
    openRequestModal();

    // send message
    const result = await client!.request({
      topic: session!.topic,
      chainId,
      request: {
        method: "eth_signTypedData",
        params,
      },
    });

    //  split chainId
    const [namespace, reference] = chainId.split(":");

    const targetChainData = chainData[namespace][reference];

    if (typeof targetChainData === "undefined") {
      throw new Error(`Missing chain data for chainId: ${chainId}`);
    }

    const rpcUrl = targetChainData.rpc[0];

    // verify signature
    const hash = hashTypedDataMessage(message);
    const valid = await verifySignature(address, result, hash, rpcUrl);

    // format displayed result
    return {
      method: "eth_signTypedData",
      address,
      valid,
      result,
    };
  });

  // ------ COSMOS RPC ------

  const testSignDirect = async (chainId: string) => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      // test direct sign doc inputs
      const inputs = {
        fee: [{ amount: "2000", denom: "ucosm" }],
        pubkey: "AgSEjOuOr991QlHCORRmdE5ahVKeyBrmtgoYepCpQGOW",
        gasLimit: 200000,
        accountNumber: 1,
        sequence: 1,
        bodyBytes:
          "0a90010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412700a2d636f736d6f7331706b707472653766646b6c366766727a6c65736a6a766878686c63337234676d6d6b38727336122d636f736d6f7331717970717870713971637273737a673270767871367273307a716733797963356c7a763778751a100a0575636f736d120731323334353637",
        authInfoBytes:
          "0a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21034f04181eeba35391b858633a765c4a0c189697b40d216354d50890d350c7029012040a020801180112130a0d0a0575636f736d12043230303010c09a0c",
      };

      // split chainId
      const [namespace, reference] = chainId.split(":");

      // format sign doc
      const signDoc = formatDirectSignDoc(
        inputs.fee,
        inputs.pubkey,
        inputs.gasLimit,
        inputs.accountNumber,
        inputs.sequence,
        inputs.bodyBytes,
        reference,
      );

      // get cosmos address
      const account = accounts.find(account => account.startsWith(chainId));
      if (account === undefined) throw new Error("Account is not found");
      const address = account.split(":").pop();
      if (address === undefined) throw new Error("Address is invalid");

      // cosmos_signDirect params
      const params = {
        signerAddress: address,
        signDoc: stringifySignDocValues(signDoc),
      };

      // open modal
      openRequestModal();

      // send message
      const result = await client.request({
        topic: session.topic,
        chainId,
        request: {
          method: "cosmos_signDirect",
          params,
        },
      });

      const targetChainData = chainData[namespace][reference];

      if (typeof targetChainData === "undefined") {
        throw new Error(`Missing chain data for chainId: ${chainId}`);
      }

      // TODO: check if valid
      const valid = true;

      // format displayed result
      const formattedResult = {
        method: "cosmos_signDirect",
        address,
        valid,
        result: result.signature.signature,
      };

      // display result
      setResult(formattedResult);
    } catch (e) {
      console.error(e);
      setResult(null);
    } finally {
      setPending(false);
    }
  };

  const testSignAmino = async (chainId: string) => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      // split chainId
      const [namespace, reference] = chainId.split(":");

      // test amino sign doc
      const signDoc = {
        msgs: [],
        fee: { amount: [], gas: "23" },
        chain_id: "foochain",
        memo: "hello, world",
        account_number: "7",
        sequence: "54",
      };

      // get cosmos address
      const account = accounts.find(account => account.startsWith(chainId));
      if (account === undefined) throw new Error("Account is not found");
      const address = account.split(":").pop();
      if (address === undefined) throw new Error("Address is invalid");

      // cosmos_signAmino params
      const params = { signerAddress: address, signDoc };

      // open modal
      openRequestModal();

      // send message
      const result = await client.request({
        topic: session.topic,
        chainId,
        request: {
          method: "cosmos_signAmino",
          params,
        },
      });

      const targetChainData = chainData[namespace][reference];

      if (typeof targetChainData === "undefined") {
        throw new Error(`Missing chain data for chainId: ${chainId}`);
      }

      // TODO: check if valid
      const valid = true;

      // format displayed result
      const formattedResult = {
        method: "cosmos_signAmino",
        address,
        valid,
        result: result.signature.signature,
      };

      // display result
      setResult(formattedResult);
    } catch (e) {
      console.error(e);
      setResult(null);
    } finally {
      setPending(false);
    }
  };

  const getEthereumActions = (): AccountAction[] => {
    return [
      { method: "eth_sendTransaction", callback: testSendTransaction },
      { method: "personal_sign", callback: testSignPersonalMessage },
      { method: "eth_signTypedData", callback: testSignTypedData },
    ];
  };

  const getCosmosActions = (): AccountAction[] => {
    return [
      { method: "cosmos_signDirect", callback: testSignDirect },
      { method: "cosmos_signAmino", callback: testSignAmino },
    ];
  };

  const getBlockchainActions = (chainId: string) => {
    const [namespace] = chainId.split(":");
    switch (namespace) {
      case "eip155":
        return getEthereumActions();
      case "cosmos":
        return getCosmosActions();
      default:
        break;
    }
  };

  const toggleTestnets = () => {
    const nextIsTestnetState = !isTestnet;
    setIsTestnet(nextIsTestnetState);
    // TODO: rename "setLocalStorage..."
    setInitialStateTestnet(nextIsTestnetState);
  };

  const handleChainSelectionClick = (chainId: string) => {
    if (chains.includes(chainId)) {
      setChains(chains.filter(chain => chain !== chainId));
    } else {
      setChains([...chains, chainId]);
    }
  };

  const renderModal = () => {
    switch (modal) {
      case "pairing":
        if (typeof client === "undefined") {
          throw new Error("WalletConnect is not initialized");
        }
        return <PairingModal pairings={client.pairing.values} connect={connect} />;
      case "request":
        return <RequestModal pending={pending} result={result} />;
      case "ping":
        return <PingModal pending={pending} result={result} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    const chainOptions = isTestnet ? DEFAULT_TEST_CHAINS : DEFAULT_MAIN_CHAINS;
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <Banner />
        <h6>
          <span>{`Using v${process.env.REACT_APP_VERSION || "2.0.0-beta"}`}</span>
        </h6>
        <SButtonContainer>
          <h6>Select chains:</h6>
          <SToggleContainer>
            <p>Testnets Only?</p>
            <Toggle active={isTestnet} onClick={toggleTestnets} />
          </SToggleContainer>
          {chainOptions.map(chainId => (
            <Blockchain
              key={chainId}
              chainId={chainId}
              chainData={chainData}
              onClick={handleChainSelectionClick}
              active={chains.includes(chainId)}
            />
          ))}
          <SConnectButton left onClick={onConnect} fetching={fetching} disabled={!chains.length}>
            {"Connect"}
          </SConnectButton>
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Accounts</h3>
        <SAccounts>
          {accounts.map(account => {
            const [namespace, reference, address] = account.split(":");
            const chainId = `${namespace}:${reference}`;
            return (
              <Blockchain
                key={account}
                active={true}
                chainData={chainData}
                fetching={fetching}
                address={address}
                chainId={chainId}
                balances={balances}
                actions={getBlockchainActions(chainId)}
              />
            );
          })}
        </SAccounts>
      </SAccountsContainer>
    );
  };

  return (
    <SLayout>
      <Column maxWidth={1000} spanHeight>
        <Header ping={ping} disconnect={disconnect} session={session} />
        <SContent>{loading ? "Loading..." : renderContent()}</SContent>
      </Column>
      <Modal show={!!modal} closeModal={closeModal}>
        {renderModal()}
      </Modal>
    </SLayout>
  );
}
