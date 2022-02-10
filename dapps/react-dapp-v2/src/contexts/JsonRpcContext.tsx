import { BigNumber } from "ethers";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as encoding from "@walletconnect/encoding";
import { formatDirectSignDoc, stringifySignDocValues } from "cosmos-wallet";

import {
  ChainNamespaces,
  eip712,
  formatTestTransaction,
  getAllChainNamespaces,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
} from "../helpers";
import { useWalletConnectClient } from "./ClientContext";
import { apiGetChainNamespace, ChainsMap } from "caip-api";

/**
 * Types
 */
interface IFormattedRpcResponse {
  method: string;
  address: string;
  valid: boolean;
  result: string;
}

interface IRpcResult {
  method: string;
  valid: boolean;
}

interface IContext {
  ping: () => Promise<void>;
  ethereumRpc: {
    testSendTransaction: (chainId: string) => Promise<void>;
    testSignPersonalMessage: (chainId: string) => Promise<void>;
    testSignTypedData: (chainId: string) => Promise<void>;
  };
  cosmosRpc: {
    testSignDirect: (chainId: string) => Promise<void>;
    testSignAmino: (chainId: string) => Promise<void>;
  };
  chainData: ChainNamespaces;
  rpcResult?: IRpcResult | null;
  isRpcRequestPending: boolean;
}

/**
 * Context
 */
export const JsonRpcContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function JsonRpcContextProvider({ children }: { children: ReactNode | ReactNode[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<IRpcResult | null>();
  const [chainData, setChainData] = useState<ChainNamespaces>({});

  const { client, session, accounts, balances } = useWalletConnectClient();

  useEffect(() => {
    loadChainData();
  }, []);

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

  const getAddressByChainId = (chainId: string) => {
    const account = accounts.find(account => account.startsWith(chainId));
    if (account === undefined) throw new Error(`Account for chainId ${chainId} not found.`);
    const address = account.split(":").pop();
    if (address === undefined) throw new Error(`Address for account ${account} is invalid`);

    return address;
  };

  const _createJsonRpcRequestHandler =
    (rpcRequest: (...requestArgs: [any]) => Promise<IFormattedRpcResponse>) =>
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

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      setPending(true);

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

  // -------- ETHEREUM/EIP155 RPC METHODS --------

  const ethereumRpc = {
    testSendTransaction: _createJsonRpcRequestHandler(async (chainId: string) => {
      // get ethereum address
      const account = accounts.find(account => account.startsWith(chainId));
      if (account === undefined) throw new Error("Account is not found");
      const address = account.split(":").pop();
      if (address === undefined) throw new Error("Address is invalid");

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
    }),
    testSignPersonalMessage: _createJsonRpcRequestHandler(async (chainId: string) => {
      // test message
      const message = `My email is john@doe.com - ${Date.now()}`;

      // encode message (hex)
      const hexMsg = encoding.utf8ToHex(message, true);

      const address = getAddressByChainId(chainId);

      // personal_sign params
      const params = [hexMsg, address];

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
    }),
    testSignTypedData: _createJsonRpcRequestHandler(async (chainId: string) => {
      // test message
      const message = JSON.stringify(eip712.example);

      const address = getAddressByChainId(chainId);

      // eth_signTypedData params
      const params = [address, message];

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
    }),
  };

  // -------- COSMOS RPC METHODS --------

  const cosmosRpc = {
    testSignDirect: _createJsonRpcRequestHandler(async (chainId: string) => {
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

      const address = getAddressByChainId(chainId);

      // cosmos_signDirect params
      const params = {
        signerAddress: address,
        signDoc: stringifySignDocValues(signDoc),
      };

      // send message
      const result = await client!.request({
        topic: session!.topic,
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
      return {
        method: "cosmos_signDirect",
        address,
        valid,
        result: result.signature.signature,
      };
    }),
    testSignAmino: _createJsonRpcRequestHandler(async (chainId: string) => {
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

      const address = getAddressByChainId(chainId);

      // cosmos_signAmino params
      const params = { signerAddress: address, signDoc };

      // send message
      const result = await client!.request({
        topic: session!.topic,
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
      return {
        method: "cosmos_signAmino",
        address,
        valid,
        result: result.signature.signature,
      };
    }),
  };

  return (
    <JsonRpcContext.Provider
      value={{
        chainData,
        ping,
        ethereumRpc,
        cosmosRpc,
        rpcResult: result,
        isRpcRequestPending: pending,
      }}
    >
      {children}
    </JsonRpcContext.Provider>
  );
}

export function useJsonRpc() {
  const context = useContext(JsonRpcContext);
  if (context === undefined) {
    throw new Error("useJsonRpc must be used within a JsonRpcContextProvider");
  }
  return context;
}
