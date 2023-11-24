import React, { useState } from "react";
import { RELAYER_SDK_VERSION as version } from "@walletconnect/core";
import * as encoding from "@walletconnect/encoding";
import { utils } from "ethers";
import { TypedDataField } from "@ethersproject/abstract-signer";
import { Transaction } from "@ethereumjs/tx";

import Banner from "./../components/Banner";
import Blockchain from "./../components/Blockchain";
import Column from "./../components/Column";
import Header from "./../components/Header";
import Modal from "./../components/Modal";
import { DEFAULT_MAIN_CHAINS, DEFAULT_TEST_CHAINS } from "./../constants";
import {
  AccountAction,
  eip712,
  getLocalStorageTestnetFlag,
  setLocaleStorageTestnetFlag,
} from "./../helpers";
import Toggle from "./../components/Toggle";
import RequestModal from "./../modals/RequestModal";
import PingModal from "./../modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SContent,
  SLanding,
  SLayout,
  SToggleContainer,
} from "./../components/app";
import { useWalletConnectClient } from "./../contexts/ClientContext";

interface IFormattedRpcResponse {
  method: string;
  address: string;
  valid: boolean;
  result: string;
}

export default function App() {
  const [isTestnet, setIsTestnet] = useState(getLocalStorageTestnetFlag());
  const [isRpcRequestPending, setIsRpcRequestPending] = useState(false);
  const [rpcResult, setRpcResult] = useState<IFormattedRpcResponse | null>();

  const [modal, setModal] = useState("");

  const closeModal = () => setModal("");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");

  // Initialize the WalletConnect client.
  const {
    client,
    session,
    disconnect,
    chain,
    accounts,
    balances,
    chainData,
    isFetchingBalances,
    isInitializing,
    connect,
    web3Provider,
  } = useWalletConnectClient();

  const verifyEip155MessageSignature = (message: string, signature: string, address: string) =>
    utils.verifyMessage(message, signature).toLowerCase() === address.toLowerCase();

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect Client is not initialized");
    }

    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      setIsRpcRequestPending(true);
      await client.ping({ topic: session.topic });
      setRpcResult({
        address: "",
        method: "ping",
        valid: true,
        result: "success",
      });
    } catch (error) {
      console.error("RPC request failed:", error);
    } finally {
      setIsRpcRequestPending(false);
    }
  };

  const onPing = async () => {
    openPingModal();
    await ping();
  };

  const testSendTransaction: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }

    const [address] = await web3Provider.eth.getAccounts();

    const tx = {
      from: address,
      to: address,
      gasPrice: "20000000000",
      value: "0",
    };

    const { transactionHash } = await web3Provider.eth.sendTransaction(tx);

    return {
      method: "eth_sendTransaction",
      address,
      valid: true,
      result: transactionHash,
    };
  };

  const testSignTransaction: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }

    const [address] = await web3Provider.eth.getAccounts();
    const tx = {
      from: address,
      to: address,
      gasPrice: "20000000000",
      value: "0",
    };

    // The return signature here is `RLPEncodedTransaction` but it actually returns as string (?).
    const signedTx = (await web3Provider.eth.signTransaction(tx)) as unknown as string;
    const valid = Transaction.fromSerializedTx(signedTx as any).verifySignature();

    return {
      method: "eth_signTransaction",
      address,
      valid,
      result: signedTx,
    };
  };

  const testSignMessage: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }
    const msg = "hello world";
    const hexMsg = encoding.utf8ToHex(msg, true);
    const [address] = await web3Provider.eth.getAccounts();
    const signature = await web3Provider.eth.personal.sign(hexMsg, address, "");
    const valid = verifyEip155MessageSignature(msg, signature, address);
    return {
      method: "personal_sign",
      address,
      valid,
      result: signature,
    };
  };

  const testEthSign: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }
    const msg = "hello world";
    const hexMsg = encoding.utf8ToHex(msg, true);
    const [address] = await web3Provider.eth.getAccounts();
    const signature = await web3Provider.eth.sign(hexMsg, address);
    const valid = verifyEip155MessageSignature(msg, signature, address);
    return {
      method: "eth_sign (standard)",
      address,
      valid,
      result: signature,
    };
  };

  const testSignTypedData: () => Promise<IFormattedRpcResponse> = async () => {
    if (!web3Provider) {
      throw new Error("web3Provider not connected");
    }
    if (!web3Provider.currentProvider) {
      throw new Error("web3Provider.currentProvider is not set");
    }

    const message = JSON.stringify(eip712.example);

    const [address] = await web3Provider.eth.getAccounts();

    // eth_signTypedData params
    const params = [address, message];

    // FIXME:
    // Property 'request' does not exist on type 'string | HttpProvider | IpcProvider | WebsocketProvider | AbstractProvider'.
    // Property 'request' does not exist on type 'string'.ts(2339)
    // @ts-expect-error
    const signature = await web3Provider.currentProvider.request({
      method: "eth_signTypedData",
      params,
    });

    // Separate `EIP712Domain` type from remaining types to verify, otherwise `ethers.utils.verifyTypedData`
    // will throw due to "unused" `EIP712Domain` type.
    // See: https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
    const { EIP712Domain, ...nonDomainTypes }: Record<string, TypedDataField[]> =
      eip712.example.types;

    const valid =
      utils
        .verifyTypedData(eip712.example.domain, nonDomainTypes, eip712.example.message, signature)
        .toLowerCase() === address.toLowerCase();

    return {
      method: "eth_signTypedData",
      address,
      valid,
      result: signature,
    };
  };

  const getEthereumActions = (): AccountAction[] => {
    const wrapRpcRequest = (rpcRequest: () => Promise<IFormattedRpcResponse>) => async () => {
      openRequestModal();
      try {
        setIsRpcRequestPending(true);
        const result = await rpcRequest();
        setRpcResult(result);
      } catch (error) {
        console.error("RPC request failed:", error);
        setRpcResult(null);
      } finally {
        setIsRpcRequestPending(false);
      }
    };

    return [
      { method: "eth_sendTransaction", callback: wrapRpcRequest(testSendTransaction) },
      { method: "eth_signTransaction", callback: wrapRpcRequest(testSignTransaction) },
      { method: "personal_sign", callback: wrapRpcRequest(testSignMessage) },
      { method: "eth_sign (standard)", callback: wrapRpcRequest(testEthSign) },
      { method: "eth_signTypedData", callback: wrapRpcRequest(testSignTypedData) },
    ];
  };

  const getBlockchainActions = (chainId: string) => {
    const [namespace] = chainId.split(":");
    switch (namespace) {
      case "eip155":
        return getEthereumActions();
      case "cosmos":
        return [];
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

  // Renders the appropriate model for the given request that is currently in-flight.
  const renderModal = () => {
    switch (modal) {
      case "request":
        return <RequestModal pending={isRpcRequestPending} result={rpcResult} />;
      case "ping":
        return <PingModal pending={isRpcRequestPending} result={rpcResult} />;
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
          <span>{`Using v${version || "2.0.0-beta"}`}</span>
        </h6>
        <SButtonContainer>
          <h6>Select an Ethereum chain:</h6>
          <SToggleContainer>
            <p>Testnets Only?</p>
            <Toggle active={isTestnet} onClick={toggleTestnets} />
          </SToggleContainer>
          {chainOptions.map(chainId => (
            <Blockchain key={chainId} chainId={chainId} chainData={chainData} onClick={connect} />
          ))}
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Account</h3>
        <SAccounts>
          {accounts.map(account => {
            return (
              <Blockchain
                key={account}
                active={true}
                chainData={chainData}
                fetching={isFetchingBalances}
                address={account}
                chainId={chain}
                balances={balances}
                actions={getBlockchainActions(chain)}
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
        <Header ping={onPing} disconnect={disconnect} session={session} />
        <SContent>{isInitializing ? "Loading..." : renderContent()}</SContent>
      </Column>
      <Modal show={!!modal} closeModal={closeModal}>
        {renderModal()}
      </Modal>
    </SLayout>
  );
}
