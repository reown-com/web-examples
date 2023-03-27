import React, { useState } from "react";
import { version } from "@walletconnect/sign-client/package.json";
import {
  formatDirectSignDoc,
  stringifySignDocValues,
  verifyAminoSignature,
  verifyDirectSignature,
} from "cosmos-wallet";

import Banner from "./../components/Banner";
import Blockchain from "./../components/Blockchain";
import Column from "./../components/Column";
import Header from "./../components/Header";
import Modal from "./../components/Modal";
import { DEFAULT_MAIN_CHAINS } from "./../constants";
import { AccountAction } from "./../helpers";
import RequestModal from "./../modals/RequestModal";
import PingModal from "./../modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SContent,
  SLanding,
  SLayout,
} from "./../components/app";
import { useWalletConnectClient } from "./../contexts/ClientContext";

interface IFormattedRpcResponse {
  method?: string;
  address?: string;
  valid?: boolean;
  result: string;
}

interface CosmosRpcResponse {
  pub_key: {
    type: string;
    value: string;
  };
  signature: string;
}

export default function App() {
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
    isInitializing,
    onEnable,
    cosmosProvider,
  } = useWalletConnectClient();

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect Client is not initialized");
    }

    try {
      setIsRpcRequestPending(true);
      const session = cosmosProvider?.session;
      if (!session) return;
      await cosmosProvider.client?.ping({ topic: session.topic! });
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

  const testSignDirect: (account: string) => Promise<IFormattedRpcResponse> = async account => {
    if (!cosmosProvider) {
      throw new Error("cosmosProvider not connected");
    }

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

    // format sign doc
    const signDoc = formatDirectSignDoc(
      inputs.fee,
      inputs.pubkey,
      inputs.gasLimit,
      inputs.accountNumber,
      inputs.sequence,
      inputs.bodyBytes,
      "cosmoshub-4",
    );

    const address = account.split(":").pop();

    if (!address) {
      throw new Error(`Could not derive address from account: ${account}`);
    }

    // cosmos_signDirect params
    const params = {
      signerAddress: address,
      signDoc: stringifySignDocValues(signDoc),
    };

    const result = await cosmosProvider.request<CosmosRpcResponse>({
      method: "cosmos_signDirect",
      params,
    });

    const valid = await verifyDirectSignature(address, result.signature, signDoc);

    return {
      method: "cosmos_signDirect",
      address,
      valid,
      result: result.signature,
    };
  };

  const testSignAmino: (account: string) => Promise<IFormattedRpcResponse> = async account => {
    if (!cosmosProvider) {
      throw new Error("cosmosProvider not connected");
    }

    // test amino sign doc
    const signDoc = {
      msgs: [],
      fee: { amount: [], gas: "23" },
      chain_id: "foochain",
      memo: "hello, world",
      account_number: "7",
      sequence: "54",
    };

    const address = account.split(":").pop();

    if (!address) {
      throw new Error(`Could not derive address from account: ${account}`);
    }

    // cosmos_signAmino params
    const params = { signerAddress: address, signDoc };

    const result = await cosmosProvider.request<CosmosRpcResponse>({
      method: "cosmos_signAmino",
      params,
    });

    const valid = await verifyAminoSignature(address, result.signature, signDoc);

    return {
      method: "cosmos_signAmino",
      address,
      valid,
      result: result.signature,
    };
  };

  const getCosmosActions = (): AccountAction[] => {
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
          setRpcResult({ result: (error as Error).message as string });
        } finally {
          setIsRpcRequestPending(false);
        }
      };

    return [
      { method: "cosmos_signDirect", callback: wrapRpcRequest(testSignDirect) },
      { method: "cosmos_signAmino", callback: wrapRpcRequest(testSignAmino) },
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

  const renderContent = () => {
    const chainOptions = DEFAULT_MAIN_CHAINS;
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <Banner />
        <h6>
          <span>{`Using v${version}`}</span>
        </h6>
        <SButtonContainer>
          <h6>Select Cosmos chain:</h6>
          {chainOptions.map(chainId => (
            <Blockchain key={chainId} chainId={chainId} chainData={chainData} onClick={onEnable} />
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
                actions={getCosmosActions()}
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
