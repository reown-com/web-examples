import React, { useState } from "react";
import { version } from "@walletconnect/client/package.json";
import { clusterApiUrl, Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

import Banner from "./components/Banner";
import Blockchain from "./components/Blockchain";
import Column from "./components/Column";
import Header from "./components/Header";
import Modal from "./components/Modal";
import { DEFAULT_MAIN_CHAINS, DEFAULT_TEST_CHAINS } from "./constants";
import { AccountAction, getLocalStorageTestnetFlag, setLocaleStorageTestnetFlag } from "./helpers";
import RequestModal from "./modals/RequestModal";
import PingModal from "./modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SContent,
  SLanding,
  SLayout,
  SToggleContainer,
} from "./components/app";
import { SolanaRpcMethod, useWalletConnectClient } from "./contexts/ClientContext";
import Toggle from "./components/Toggle";

interface IFormattedRpcResponse {
  method?: string;
  address?: string;
  valid?: boolean;
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
    publicKeys,
    balances,
    chainData,
    isInitializing,
    onEnable,
  } = useWalletConnectClient();

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect Client is not initialized");
    }

    try {
      setIsRpcRequestPending(true);
      const _session = await client.session.get(client.session.topics[0]);
      await client.session.ping(_session.topic);
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

  const testSignTransaction = async (account: string): Promise<IFormattedRpcResponse> => {
    if (!client || !publicKeys || !session) {
      throw new Error("WalletConnect Client not initialized properly.");
    }

    const address = account.split(":").pop();

    if (!address) {
      throw new Error(`Could not derive Solana address from CAIP account: ${account}`);
    }

    const senderPublicKey = publicKeys[address];

    const connection = new Connection(clusterApiUrl(isTestnet ? "testnet" : "mainnet-beta"));
    // Using deprecated `getRecentBlockhash` over `getLatestBlockhash` here, since `mainnet-beta`
    // cluster only seems to support `connection.getRecentBlockhash` currently.
    const { blockhash } = await connection.getRecentBlockhash();

    const transaction = new Transaction({
      feePayer: senderPublicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      }),
    );

    try {
      const result = await client.request({
        topic: session.topic,
        request: {
          method: SolanaRpcMethod.SOL_SIGN_TRANSACTION,
          params: {
            feePayer: transaction.feePayer!.toBase58(),
            recentBlockhash: transaction.recentBlockhash,
            instructions: transaction.instructions.map(i => ({
              programId: i.programId.toBase58(),
              data: bs58.encode(i.data),
              keys: i.keys.map(k => ({
                isSigner: k.isSigner,
                isWritable: k.isWritable,
                pubkey: k.pubkey.toBase58(),
              })),
            })),
          },
        },
      });

      // transaction.addSignature(senderPublicKey, bs58.decode(signature));

      return {
        method: SolanaRpcMethod.SOL_SIGN_TRANSACTION,
        address,
        valid: true,
        result: result.signature,
      };
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const getSolanaActions = (): AccountAction[] => {
    const wrapRpcRequest =
      (rpcRequest: (account: string) => Promise<IFormattedRpcResponse>) =>
      async (account: string) => {
        openRequestModal();
        try {
          setIsRpcRequestPending(true);
          const result = await rpcRequest(account);
          setRpcResult(result);
        } catch (error) {
          console.error("RPC request failed:", error);
          setRpcResult({ result: error as string });
        } finally {
          setIsRpcRequestPending(false);
        }
      };

    return [
      {
        method: SolanaRpcMethod.SOL_SIGN_TRANSACTION,
        callback: wrapRpcRequest(testSignTransaction),
      },
    ];
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

  // Toggle between displaying testnet or mainnet chains as selection options.
  const toggleTestnets = () => {
    const nextIsTestnetState = !isTestnet;
    setIsTestnet(nextIsTestnetState);
    setLocaleStorageTestnetFlag(nextIsTestnetState);
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
          <h6>Select chain:</h6>
          <SToggleContainer>
            <p>Testnet Only?</p>
            <Toggle active={isTestnet} onClick={toggleTestnets} />
          </SToggleContainer>
          {chainOptions.map(chainId => (
            <Blockchain
              key={chainId}
              chainId={chainId}
              chainData={chainData}
              isTestnet={isTestnet}
              onClick={onEnable}
            />
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
                address={account}
                chainId={chain}
                balances={balances}
                isTestnet={isTestnet}
                actions={getSolanaActions()}
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
