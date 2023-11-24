import type { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";

import Banner from "../components/Banner";
import Blockchain from "../components/Blockchain";
import Column from "../components/Column";
import RelayRegionDropdown from "../components/RelayRegionDropdown";
import Header from "../components/Header";
import Modal from "../components/Modal";
import {
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_MAIN_CHAINS,
  DEFAULT_SOLANA_METHODS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_MULTIVERSX_METHODS,
  DEFAULT_TEST_CHAINS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_KADENA_METHODS,
  DEFAULT_TRON_METHODS,
  DEFAULT_TEZOS_METHODS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
} from "../constants";
import { AccountAction, setLocaleStorageTestnetFlag } from "../helpers";
import Toggle from "../components/Toggle";
import RequestModal from "../modals/RequestModal";
import PairingModal from "../modals/PairingModal";
import PingModal from "../modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SConnectButton,
  SContent,
  SDropDownContainer,
  SLanding,
  SLayout,
  SToggleContainer,
} from "../components/app";
import { useWalletConnectClient } from "../contexts/ClientContext";
import { useJsonRpc } from "../contexts/JsonRpcContext";
import { useChainData } from "../contexts/ChainDataContext";
import Icon from "../components/Icon";
import OriginSimulationDropdown from "../components/OriginSimulationDropdown";

// Normal import does not work here
const { version } = require("@walletconnect/sign-client/package.json");

const Home: NextPage = () => {
  const [modal, setModal] = useState("");

  const closeModal = () => setModal("");
  const openPairingModal = () => setModal("pairing");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");

  // Initialize the WalletConnect client.
  const {
    client,
    pairings,
    session,
    connect,
    disconnect,
    chains,
    relayerRegion,
    accounts,
    balances,
    isFetchingBalances,
    isInitializing,
    setChains,
    setRelayerRegion,
    origin,
  } = useWalletConnectClient();

  // Use `JsonRpcContext` to provide us with relevant RPC methods and states.
  const {
    ping,
    ethereumRpc,
    cosmosRpc,
    solanaRpc,
    polkadotRpc,
    nearRpc,
    multiversxRpc,
    tronRpc,
    tezosRpc,
    kadenaRpc,
    isRpcRequestPending,
    rpcResult,
    isTestnet,
    setIsTestnet,
  } = useJsonRpc();

  const { chainData } = useChainData();

  // Close the pairing modal after a session is established.
  useEffect(() => {
    if (session && modal === "pairing") {
      closeModal();
    }
  }, [session, modal]);

  const onConnect = () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    // Suggest existing pairings (if any).
    if (pairings.length) {
      openPairingModal();
    } else {
      // If no existing pairings are available, trigger `WalletConnectClient.connect`.
      connect();
    }
  };

  const onPing = async () => {
    openPingModal();
    await ping();
  };

  async function emit() {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    await client.emit({
      topic: session?.topic || "",
      event: { name: "chainChanged", data: {} },
      chainId: "eip155:5",
    });
  }

  const getEthereumActions = (): AccountAction[] => {
    const actions = {
      [DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION]: {
        method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testSendTransaction(chainId, address);
        },
      },
      [DEFAULT_EIP155_METHODS.PERSONAL_SIGN]: {
        method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testSignPersonalMessage(chainId, address);
        },
      },
      [DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION]: {
        method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testSignTransaction(chainId, address);
        },
      },
      [DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN]: {
        method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN + " (standard)",
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testEthSign(chainId, address);
        },
      },
      [DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA]: {
        method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testSignTypedData(chainId, address);
        },
      },
      [DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA_V4]: {
        method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA_V4,
        callback: async (chainId: string, address: string) => {
          openRequestModal();
          await ethereumRpc.testSignTypedDatav4(chainId, address);
        },
      },
    };

    let availableActions: AccountAction[] = [];

    session?.namespaces?.["eip155"].methods.forEach((methodName) => {
      const action: AccountAction | undefined =
        actions[methodName as keyof typeof actions];
      if (action) {
        availableActions.push(action);
      }
    });

    return availableActions;
  };

  const getCosmosActions = (): AccountAction[] => {
    const onSignDirect = async (chainId: string, address: string) => {
      openRequestModal();
      await cosmosRpc.testSignDirect(chainId, address);
    };
    const onSignAmino = async (chainId: string, address: string) => {
      openRequestModal();
      await cosmosRpc.testSignAmino(chainId, address);
    };
    return [
      {
        method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_DIRECT,
        callback: onSignDirect,
      },
      {
        method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_AMINO,
        callback: onSignAmino,
      },
    ];
  };

  const getSolanaActions = (): AccountAction[] => {
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await solanaRpc.testSignTransaction(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await solanaRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_SOLANA_METHODS.SOL_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_SOLANA_METHODS.SOL_SIGN_MESSAGE,
        callback: onSignMessage,
      },
    ];
  };

  const getPolkadotActions = (): AccountAction[] => {
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await polkadotRpc.testSignTransaction(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await polkadotRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_MESSAGE,
        callback: onSignMessage,
      },
    ];
  };

  const getNearActions = (): AccountAction[] => {
    const onSignAndSendTransaction = async (
      chainId: string,
      address: string
    ) => {
      openRequestModal();
      await nearRpc.testSignAndSendTransaction(chainId, address);
    };
    const onSignAndSendTransactions = async (
      chainId: string,
      address: string
    ) => {
      openRequestModal();
      await nearRpc.testSignAndSendTransactions(chainId, address);
    };
    return [
      {
        method: DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION,
        callback: onSignAndSendTransaction,
      },
      {
        method: DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS,
        callback: onSignAndSendTransactions,
      },
    ];
  };

  const getMultiversxActions = (): AccountAction[] => {
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await multiversxRpc.testSignTransaction(chainId, address);
    };
    const onSignTransactions = async (chainId: string, address: string) => {
      openRequestModal();
      await multiversxRpc.testSignTransactions(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await multiversxRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTIONS,
        callback: onSignTransactions,
      },
      {
        method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_MESSAGE,
        callback: onSignMessage,
      },
    ];
  };

  const getTronActions = (): AccountAction[] => {
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await tronRpc.testSignTransaction(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await tronRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_TRON_METHODS.TRON_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_TRON_METHODS.TRON_SIGN_MESSAGE,
        callback: onSignMessage,
      },
    ];
  };

  const getTezosActions = (): AccountAction[] => {
    const onGetAccounts = async (chainId: string, address: string) => {
      openRequestModal();
      await tezosRpc.testGetAccounts(chainId, address);
    };
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await tezosRpc.testSignTransaction(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await tezosRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
        callback: onGetAccounts,
      },
      {
        method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
        callback: onSignMessage,
      },
    ];
  };

  const getKadenaActions = (): AccountAction[] => {
    const testGetAccounts = async (chainId: string, address: string) => {
      openRequestModal();
      await kadenaRpc.testGetAccounts(chainId, address);
    };
    const testSign = async (chainId: string, address: string) => {
      openRequestModal();
      await kadenaRpc.testSign(chainId, address);
    };

    const testSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await kadenaRpc.testQuicksign(chainId, address);
    };

    return [
      {
        method: DEFAULT_KADENA_METHODS.KADENA_GET_ACCOUNTS,
        callback: testGetAccounts,
      },
      {
        method: DEFAULT_KADENA_METHODS.KADENA_SIGN,
        callback: testSign,
      },
      {
        method: DEFAULT_KADENA_METHODS.KADENA_QUICKSIGN,
        callback: testSignMessage,
      },
    ];
  };

  const getBlockchainActions = (chainId: string) => {
    const [namespace] = chainId.split(":");
    switch (namespace) {
      case "eip155":
        return getEthereumActions();
      case "cosmos":
        return getCosmosActions();
      case "solana":
        return getSolanaActions();
      case "polkadot":
        return getPolkadotActions();
      case "near":
        return getNearActions();
      case "mvx":
        return getMultiversxActions();
      case "tron":
        return getTronActions();
      case "tezos":
        return getTezosActions();
      case "kadena":
        return getKadenaActions();
      default:
        break;
    }
  };

  // Toggle between displaying testnet or mainnet chains as selection options.
  const toggleTestnets = () => {
    const nextIsTestnetState = !isTestnet;
    setIsTestnet(nextIsTestnetState);
    setLocaleStorageTestnetFlag(nextIsTestnetState);
  };

  const handleChainSelectionClick = (chainId: string) => {
    if (chains.includes(chainId)) {
      setChains(chains.filter((chain) => chain !== chainId));
    } else {
      setChains([...chains, chainId]);
    }
  };

  // Renders the appropriate model for the given request that is currently in-flight.
  const renderModal = () => {
    switch (modal) {
      case "pairing":
        if (typeof client === "undefined") {
          throw new Error("WalletConnect is not initialized");
        }
        return <PairingModal pairings={pairings} connect={connect} />;
      case "request":
        return (
          <RequestModal pending={isRpcRequestPending} result={rpcResult} />
        );
      case "ping":
        return <PingModal pending={isRpcRequestPending} result={rpcResult} />;
      default:
        return null;
    }
  };

  const [openSelect, setOpenSelect] = useState(false);

  const openDropdown = () => {
    setOpenSelect(!openSelect);
  };

  const renderContent = () => {
    const chainOptions = isTestnet ? DEFAULT_TEST_CHAINS : DEFAULT_MAIN_CHAINS;

    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <Banner />
        <h6>{`Using v${version || "2.0.0-beta"}`}</h6>
        <SButtonContainer>
          <h6>Select chains:</h6>
          <SToggleContainer>
            <p>Testnets Only?</p>
            <Toggle active={isTestnet} onClick={toggleTestnets} />
          </SToggleContainer>
          {chainOptions.map((chainId) => (
            <Blockchain
              key={chainId}
              chainId={chainId}
              chainData={chainData}
              onClick={handleChainSelectionClick}
              active={chains.includes(chainId)}
            />
          ))}
          <SConnectButton left onClick={onConnect} disabled={!chains.length}>
            Connect
          </SConnectButton>
          <SDropDownContainer>
            <RelayRegionDropdown
              relayerRegion={relayerRegion}
              setRelayerRegion={setRelayerRegion}
              show={openSelect}
            />
            <OriginSimulationDropdown origin={origin} show={openSelect} />
          </SDropDownContainer>
          <button onClick={openDropdown} style={{ background: "transparent" }}>
            <Icon size={30} src={"/assets/settings.svg"} />
          </button>
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Accounts</h3>
        <SAccounts>
          {accounts.map((account) => {
            const [namespace, reference, address] = account.split(":");
            const chainId = `${namespace}:${reference}`;
            return (
              <Blockchain
                key={account}
                active
                chainData={chainData}
                fetching={isFetchingBalances}
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
        <Header
          ping={onPing}
          disconnect={disconnect}
          session={session}
          emit={emit}
        />
        <SContent>{isInitializing ? "Loading..." : renderContent()}</SContent>
      </Column>
      <Modal show={!!modal} closeModal={closeModal}>
        {renderModal()}
      </Modal>
    </SLayout>
  );
};

export default Home;
