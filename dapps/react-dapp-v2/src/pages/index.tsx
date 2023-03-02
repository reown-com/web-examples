import type { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";

import Banner from "../components/Banner";
import Blockchain from "../components/Blockchain";
import Column from "../components/Column";
import Header from "../components/Header";
import Modal from "../components/Modal";
import {
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_MAIN_CHAINS,
  DEFAULT_SOLANA_METHODS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_ELROND_METHODS,
  DEFAULT_TEST_CHAINS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_PROJECT_ID,
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
  SLanding,
  SLayout,
  SToggleContainer,
  SVersionTag,
} from "../components/app";
import { useWalletConnectClient } from "../contexts/ClientContext";
import { useJsonRpc } from "../contexts/JsonRpcContext";
import { useChainData } from "../contexts/ChainDataContext";
import packageJson from "../../package.json";
import RelayerRegionDropdown from "../components/RelayerRegionDropdown";
import PushMessageModal from "../modals/PushMessageModal";

const Home: NextPage = () => {
  const [modal, setModal] = useState("");
  const [castAccounts, setCastAccounts] = useState<string[]>([]);
  const [isSendingPushMessage, setIsSendingPushMessage] =
    useState<boolean>(false);

  const closeModal = () => setModal("");
  const openPairingModal = () => setModal("pairing");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");
  const openPushMessageModal = () => setModal("push");

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
    pushClient,
    activePushSubscription,
  } = useWalletConnectClient();

  // Use `JsonRpcContext` to provide us with relevant RPC methods and states.
  const {
    ping,
    ethereumRpc,
    cosmosRpc,
    solanaRpc,
    polkadotRpc,
    nearRpc,
    elrondRpc,
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

  const onSendPushNotification = async () => {
    if (typeof pushClient === "undefined") {
      throw new Error("PushClient is not initialized");
    }

    try {
      setIsSendingPushMessage(true);
      openPushMessageModal();

      const message = {
        title: "Push Notification Test",
        body: "Hello from the react example dapp 👋",
        icon: "",
        url: "",
      };

      const subscriptions = Object.values(pushClient.getActiveSubscriptions());
      const latestSubscription = subscriptions[subscriptions.length - 1];

      console.log(
        "[PUSH DEMO] Sending push_message on latest subscription: ",
        latestSubscription
      );

      await pushClient.notify({ topic: latestSubscription.topic, message });
    } catch (error) {
      console.error(
        "[PUSH DEMO] Error sending Push Message via Websocket: ",
        error
      );
    } finally {
      setIsSendingPushMessage(false);
    }
  };

  const onSendCastNotify = async () => {
    if (typeof pushClient === "undefined") {
      throw new Error("PushClient is not initialized");
    }

    try {
      setIsSendingPushMessage(true);
      openPushMessageModal();

      const subscriptions = Object.values(pushClient.getActiveSubscriptions());
      const latestSubscription = subscriptions[subscriptions.length - 1];
      const accounts = castAccounts.length
        ? castAccounts
        : [latestSubscription.account];

      const notifyBody = JSON.stringify({
        notification: {
          title: "WalletConnect Push Dapp",
          body: "Cast Notify Test",
          url: "https://walletconnect.com",
          icon: "",
        },
        accounts,
      });

      console.log(
        `[PUSH DEMO] POST'ing to ${pushClient.castUrl}/notify with body: `,
        notifyBody
      );

      const response = await fetch(
        `${pushClient.castUrl}/${DEFAULT_PROJECT_ID}/notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: notifyBody,
        }
      );
      const data = await response.json();
      console.log(`[PUSH DEMO] ${pushClient.castUrl}/notify result:`, data);
    } catch (error) {
      console.error("[PUSH DEMO] Sending PushMessage via Cast failed: ", error);
    } finally {
      setIsSendingPushMessage(false);
    }
  };

  const getEthereumActions = (): AccountAction[] => {
    const onSendTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSendTransaction(chainId, address);
    };
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignTransaction(chainId, address);
    };
    const onSignPersonalMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignPersonalMessage(chainId, address);
    };
    const onEthSign = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testEthSign(chainId, address);
    };
    const onSignTypedData = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignTypedData(chainId, address);
    };

    return [
      {
        method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
        callback: onSendTransaction,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
        callback: onSignPersonalMessage,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN + " (standard)",
        callback: onEthSign,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN_TYPED_DATA,
        callback: onSignTypedData,
      },
    ];
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

  const getElrondActions = (): AccountAction[] => {
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await elrondRpc.testSignTransaction(chainId, address);
    };
    const onSignTransactions = async (chainId: string, address: string) => {
      openRequestModal();
      await elrondRpc.testSignTransactions(chainId, address);
    };
    const onSignMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await elrondRpc.testSignMessage(chainId, address);
    };
    return [
      {
        method: DEFAULT_ELROND_METHODS.ELROND_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_ELROND_METHODS.ELROND_SIGN_TRANSACTIONS,
        callback: onSignTransactions,
      },
      {
        method: DEFAULT_ELROND_METHODS.ELROND_SIGN_MESSAGE,
        callback: onSignMessage,
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
      case "elrond":
        return getElrondActions();
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
      case "push":
        return <PushMessageModal pending={isSendingPushMessage} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    const chainOptions = isTestnet ? DEFAULT_TEST_CHAINS : DEFAULT_MAIN_CHAINS;
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <Banner />
        <div>
          <SVersionTag>{`SignClient v${packageJson.dependencies["@walletconnect/sign-client"]}`}</SVersionTag>
          <SVersionTag>{`PushClient v${packageJson.dependencies["@walletconnect/push-client"]}`}</SVersionTag>
        </div>
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
            {"Connect"}
          </SConnectButton>
          <RelayerRegionDropdown
            relayerRegion={relayerRegion}
            setRelayerRegion={setRelayerRegion}
          />
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
                active={true}
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
          sendPushMessage={onSendPushNotification}
          sendCastNotify={onSendCastNotify}
          ping={onPing}
          disconnect={disconnect}
          session={session}
          hasActivePushSubscription={
            typeof activePushSubscription !== "undefined"
          }
          castAccounts={castAccounts}
          setCastAccounts={setCastAccounts}
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
