import { BigNumber, utils } from "ethers";
import { createContext, ReactNode, useContext, useState } from "react";
import * as encoding from "@walletconnect/encoding";
import { Transaction as EthTransaction } from "@ethereumjs/tx";
import { recoverTransaction } from "@celo/wallet-base";
import * as bitcoin from "bitcoinjs-lib";
import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import * as NearApi from "near-api-js";

import {
  formatDirectSignDoc,
  stringifySignDocValues,
  verifyAminoSignature,
  verifyDirectSignature,
} from "cosmos-wallet";
import bs58 from "bs58";
import { verifyMessageSignature } from "solana-wallet";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction as SolanaTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
// @ts-expect-error
import TronWeb from "tronweb";
import {
  IPactCommand,
  PactCommand,
  createWalletConnectQuicksign,
  createWalletConnectSign,
} from "@kadena/client";
import { PactNumber } from "@kadena/pactjs";
import {
  IUTXO,
  KadenaAccount,
  eip712,
  formatTestBatchCall,
  formatTestTransaction,
  getLocalStorageTestnetFlag,
  getProviderUrl,
  getSuiClient,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
} from "../helpers";
import { useWalletConnectClient } from "./ClientContext";
import {
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_SOLANA_METHODS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_MULTIVERSX_METHODS,
  DEFAULT_TRON_METHODS,
  DEFAULT_TEZOS_METHODS,
  DEFAULT_KADENA_METHODS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
  DEFAULT_EIP5792_METHODS,
  SendCallsParams,
  GetCapabilitiesResult,
  GetCallsResult,
  DEFAULT_BIP122_METHODS,
  DEFAULT_EIP7715_METHODS,
  WalletGrantPermissionsParameters,
  WalletGrantPermissionsReturnType,
  DEFAULT_SUI_METHODS,
  DEFAULT_STACKS_METHODS,
} from "../constants";
import { useChainData } from "./ChainDataContext";
import { rpcProvidersByChainId } from "../../src/helpers/api";
import { signatureVerify, cryptoWaitReady } from "@polkadot/util-crypto";

import {
  publicKeyFromSignatureRsv,
  getAddressFromPublicKey,
} from "@stacks/transactions";
import { sha256 } from "@noble/hashes/sha2";

import {
  Transaction as MultiversxTransaction,
  TransactionPayload,
  Address,
  SignableMessage,
} from "@multiversx/sdk-core";
import { UserVerifier } from "@multiversx/sdk-wallet/out/userVerifier";
import { parseEther } from "ethers/lib/utils";
import {
  apiGetAddressUtxos,
  calculateChange,
  getAvailableBalanceFromUtxos,
  isBip122Testnet,
  isOrdinalAddress,
  isValidBip122Signature,
} from "../helpers/bip122";
import { getAddressFromAccount } from "@walletconnect/utils";
import { BIP122_DUST_LIMIT } from "../chains/bip122";
import { SuiClient } from "@mysten/sui/client";
import { AccessKeyView } from "near-api-js/lib/providers/provider";

/**
 * Types
 */
interface IFormattedRpcResponse {
  method?: string;
  address?: string;
  valid: boolean;
  result: string;
}

type TRpcRequestCallback = (
  chainId: string,
  address: string,
  message?: string
) => Promise<void>;

interface IContext {
  ping: () => Promise<void>;
  ethereumRpc: {
    testSendTransaction: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testEthSign: TRpcRequestCallback;
    testSignPersonalMessage: TRpcRequestCallback;
    testSignTypedData: TRpcRequestCallback;
    testSignTypedDatav4: TRpcRequestCallback;
    testWalletGetCapabilities: TRpcRequestCallback;
    testWalletSendCalls: TRpcRequestCallback;
    testWalletGrantPermissions: TRpcRequestCallback;
    testWalletGetCallsStatus: TRpcRequestCallback;
  };
  cosmosRpc: {
    testSignDirect: TRpcRequestCallback;
    testSignAmino: TRpcRequestCallback;
  };
  solanaRpc: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  polkadotRpc: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  nearRpc: {
    testSignAndSendTransaction: TRpcRequestCallback;
    testSignAndSendTransactions: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testSignTransactions: TRpcRequestCallback;
  };
  multiversxRpc: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testSignTransactions: TRpcRequestCallback;
  };
  tronRpc: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  tezosRpc: {
    testGetAccounts: TRpcRequestCallback;
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  kadenaRpc: {
    testGetAccounts: TRpcRequestCallback;
    testSign: TRpcRequestCallback;
    testQuicksign: TRpcRequestCallback;
  };
  bip122Rpc: {
    testGetAccountAddresses: TRpcRequestCallback;
    testSignMessage: TRpcRequestCallback;
    testSendTransaction: TRpcRequestCallback;
    testSignPsbt: TRpcRequestCallback;
  };
  suiRpc: {
    testSendSuiTransaction: TRpcRequestCallback;
    testSignSuiTransaction: TRpcRequestCallback;
    testSignSuiPersonalMessage: TRpcRequestCallback;
  };
  stacksRpc: {
    testSendTransfer: TRpcRequestCallback;
    testSignMessage: TRpcRequestCallback;
  };
  rpcResult?: IFormattedRpcResponse | null;
  isRpcRequestPending: boolean;
  isTestnet: boolean;
  setIsTestnet: (isTestnet: boolean) => void;
}

/**
 * Context
 */
export const JsonRpcContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function JsonRpcContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<IFormattedRpcResponse | null>();
  const [isTestnet, setIsTestnet] = useState(getLocalStorageTestnetFlag());
  const [lastTxId, setLastTxId] = useState<`0x${string}`>();
  const [kadenaAccount, setKadenaAccount] = useState<KadenaAccount | null>(
    null
  );

  const { client, session, accounts, balances, solanaPublicKeys, setAccounts } =
    useWalletConnectClient();

  const { chainData } = useChainData();

  const _createJsonRpcRequestHandler =
    (
      rpcRequest: (
        chainId: string,
        address: string
      ) => Promise<IFormattedRpcResponse>
    ) =>
    async (chainId: string, address: string) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof session === "undefined") {
        throw new Error("Session is not connected");
      }

      try {
        setPending(true);
        const result = await rpcRequest(chainId, address);
        setResult(result);
      } catch (err: any) {
        console.error("RPC request failed: ", err);
        setResult({
          address,
          valid: false,
          result: err?.message ?? err,
        });
      } finally {
        setPending(false);
      }
    };

  const _verifyEip155MessageSignature = (
    message: string,
    signature: string,
    address: string
  ) =>
    utils.verifyMessage(message, signature).toLowerCase() ===
    address.toLowerCase();

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
        await client.ping({ topic: session.topic });
        valid = true;
      } catch (e) {
        valid = false;
      }

      // display result
      setResult({
        method: "ping",
        valid,
        result: valid ? "Ping succeeded" : "Ping failed",
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
    testSendTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        const balance = BigNumber.from(balances[account][0].balance || "0");
        if (balance.lt(BigNumber.from(tx.gasPrice).mul(tx.gasLimit))) {
          return {
            method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
            address,
            valid: false,
            result: "Insufficient funds for intrinsic transaction cost",
          };
        }

        const result = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
            params: [tx],
          },
        });

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
          address,
          valid: true,
          result,
        };
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        const signedTx = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
            params: [tx],
          },
        });

        const CELO_ALFAJORES_CHAIN_ID = 44787;
        const CELO_MAINNET_CHAIN_ID = 42220;

        let valid = false;
        const [, reference] = chainId.split(":");
        if (
          reference === CELO_ALFAJORES_CHAIN_ID.toString() ||
          reference === CELO_MAINNET_CHAIN_ID.toString()
        ) {
          const [, signer] = recoverTransaction(signedTx);
          valid = signer.toLowerCase() === address.toLowerCase();
        } else {
          valid = EthTransaction.fromSerializedTx(
            signedTx as any
          ).verifySignature();
        }

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
          address,
          valid,
          result: signedTx,
        };
      }
    ),
    testSignPersonalMessage: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;

        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // personal_sign params
        const params = [hexMsg, address];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testEthSign: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;
        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // eth_sign params
        const params = [address, hexMsg];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN + " (standard)",
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedData: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);

        // eth_signTypedData params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedDatav4: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);
        console.log("eth_signTypedData_v4");

        // eth_signTypedData_v4 params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA_V4,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testWalletGetCapabilities: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        // The wallet_getCapabilities "caching" should ultimately move into the provider.
        // check the session.sessionProperties first for capabilities
        const capabilitiesJson = session?.sessionProperties?.["capabilities"];
        const walletCapabilities =
          capabilitiesJson && JSON.parse(capabilitiesJson as string);
        let capabilities = walletCapabilities[address] as
          | GetCapabilitiesResult
          | undefined;
        // send request for wallet_getCapabilities
        if (!capabilities)
          capabilities = await client!.request<GetCapabilitiesResult>({
            topic: session!.topic,
            chainId,
            request: {
              method: DEFAULT_EIP5792_METHODS.WALLET_GET_CAPABILITIES,
              params: [address],
            },
          });

        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_GET_CAPABILITIES,
          address,
          valid: true,
          result: JSON.stringify(capabilities),
        };
      }
    ),
    testWalletGetCallsStatus: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        if (lastTxId === undefined)
          throw new Error(
            `Last transaction ID is undefined, make sure previous call to sendCalls returns successfully. `
          );
        const params = [lastTxId];
        // send request for wallet_getCallsStatus
        const getCallsStatusResult = await client!.request<GetCallsResult>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP5792_METHODS.WALLET_GET_CALLS_STATUS,
            params: params,
          },
        });

        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_GET_CALLS_STATUS,
          address,
          valid: true,
          result: JSON.stringify(getCallsStatusResult),
        };
      }
    ),
    testWalletSendCalls: _createJsonRpcRequestHandler(
      //Sample test call - batch multiple native send tx

      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const balance = BigNumber.from(balances[account][0].balance || "0");
        if (balance.lt(parseEther("0.0002"))) {
          return {
            method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
            address,
            valid: false,
            result:
              "Insufficient funds for batch call [minimum 0.0002ETH required excluding gas].",
          };
        }
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];
        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        const sendCallsRequestParams: SendCallsParams =
          await formatTestBatchCall(account);
        // send batch Tx
        const txId = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
            params: [sendCallsRequestParams],
          },
        });
        // store the last transactionId to use it for wallet_getCallsReceipt
        setLastTxId(
          txId && txId.startsWith("0x") ? (txId as `0x${string}`) : undefined
        );
        // format displayed result
        return {
          method: DEFAULT_EIP5792_METHODS.WALLET_SEND_CALLS,
          address,
          valid: true,
          result: txId,
        };
      }
    ),
    testWalletGrantPermissions: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);
        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];
        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }
        const walletGrantPermissionsParameters: WalletGrantPermissionsParameters =
          {
            signer: {
              type: "key",
              data: {
                id: "0xc3cE257B5e2A2ad92747dd486B38d7b4B36Ac7C9",
              },
            },
            permissions: [
              {
                type: "native-token-limit",
                data: {
                  amount: parseEther("0.5"),
                },
                policies: [],
                required: true,
              },
            ],

            expiry: 1716846083638,
          } as WalletGrantPermissionsParameters;
        // send wallet_grantPermissions rpc request
        const issuePermissionResponse =
          await client!.request<WalletGrantPermissionsReturnType>({
            topic: session!.topic,
            chainId,
            request: {
              method: DEFAULT_EIP7715_METHODS.WALLET_GRANT_PERMISSIONS,
              params: [walletGrantPermissionsParameters],
            },
          });

        // format displayed result
        return {
          method: DEFAULT_EIP7715_METHODS.WALLET_GRANT_PERMISSIONS,
          address,
          valid: true,
          result: JSON.stringify(issuePermissionResponse),
        };
      }
    ),
  };

  // -------- COSMOS RPC METHODS --------

  const cosmosRpc = {
    testSignDirect: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
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
          reference
        );

        // cosmos_signDirect params
        const params = {
          signerAddress: address,
          signDoc: stringifySignDocValues(signDoc),
        };

        console.log("cosmos_signDirect params", params);

        // send message
        const result = await client!.request<{
          signature: { signature: string };
        }>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_DIRECT,
            params,
          },
        });

        console.log("cosmos_signDirect result", result);
        const targetChainData = chainData[namespace][reference];

        if (typeof targetChainData === "undefined") {
          throw new Error(`Missing chain data for chainId: ${chainId}`);
        }

        const valid = await verifyDirectSignature(
          address,
          result.signature.signature,
          signDoc
        );

        // format displayed result
        return {
          method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_DIRECT,
          address,
          valid,
          result: result.signature.signature,
        };
      }
    ),
    testSignAmino: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
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

        // cosmos_signAmino params
        const params = { signerAddress: address, signDoc };

        console.log("cosmos_signAmino params", params);

        // send message
        const result = await client!.request<{
          signature: { signature: string };
        }>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_AMINO,
            params,
          },
        });

        console.log("cosmos_signAmino result", result);

        const targetChainData = chainData[namespace][reference];

        if (typeof targetChainData === "undefined") {
          throw new Error(`Missing chain data for chainId: ${chainId}`);
        }

        const valid = await verifyAminoSignature(
          address,
          result.signature.signature,
          signDoc
        );

        // format displayed result
        return {
          method: DEFAULT_COSMOS_METHODS.COSMOS_SIGN_AMINO,
          address,
          valid,
          result: result.signature.signature,
        };
      }
    ),
  };

  // -------- SOLANA RPC METHODS --------

  const solanaRpc = {
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        if (!solanaPublicKeys) {
          throw new Error("Could not find Solana PublicKeys.");
        }

        const senderPublicKey = solanaPublicKeys[address];

        // rpc.walletconnect.com doesn't support solana testnet yet
        const connection = new Connection(
          isTestnet ? clusterApiUrl("testnet") : getProviderUrl(chainId)
        );

        // Using deprecated `getRecentBlockhash` over `getLatestBlockhash` here, since `mainnet-beta`
        // cluster only seems to support `connection.getRecentBlockhash` currently.
        const { blockhash } = await connection.getRecentBlockhash();

        const transaction = new SolanaTransaction({
          feePayer: senderPublicKey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: Keypair.generate().publicKey,
            lamports: 1,
          })
        );

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_SOLANA_METHODS.SOL_SIGN_TRANSACTION,
            params: {
              feePayer: transaction.feePayer!.toBase58(),
              recentBlockhash: transaction.recentBlockhash!,
              instructions: transaction.instructions.map((instruction) => ({
                programId: instruction.programId.toBase58(),
                keys: instruction.keys.map((key) => ({
                  ...key,
                  pubkey: key.pubkey.toBase58(),
                })),
                data: bs58.encode(new Uint8Array(instruction.data)),
              })),
              partialSignatures: transaction.signatures.map((sign) => ({
                pubkey: sign.publicKey.toBase58(),
                signature: bs58.encode(new Uint8Array(sign.signature!)),
              })),
              transaction: transaction
                .serialize({ verifySignatures: false })
                .toString("base64"),
            },
          },
        });

        // We only need `Buffer.from` here to satisfy the `Buffer` param type for `addSignature`.
        // The resulting `UInt8Array` is equivalent to just `bs58.decode(...)`.
        transaction.addSignature(
          senderPublicKey,
          Buffer.from(bs58.decode(result.signature))
        );

        const valid = transaction.verifySignatures();

        return {
          method: DEFAULT_SOLANA_METHODS.SOL_SIGN_TRANSACTION,
          address,
          valid,
          result: result.signature,
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        if (!solanaPublicKeys) {
          throw new Error("Could not find Solana PublicKeys.");
        }

        const senderPublicKey = solanaPublicKeys[address];

        // Encode message to `UInt8Array` first via `TextEncoder` so we can pass it to `bs58.encode`.
        const message = bs58.encode(
          new TextEncoder().encode(
            `This is an example message to be signed - ${Date.now()}`
          )
        );

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_SOLANA_METHODS.SOL_SIGN_MESSAGE,
            params: {
              pubkey: senderPublicKey.toBase58(),
              message,
            },
          },
        });

        const valid = verifyMessageSignature(
          senderPublicKey.toBase58(),
          result.signature,
          message
        );

        return {
          method: DEFAULT_SOLANA_METHODS.SOL_SIGN_MESSAGE,
          address,
          valid,
          result: result.signature,
        };
      }
    ),
  };

  // -------- POLKADOT RPC METHODS --------
  const polkadotRpc = {
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const transactionPayload = {
          specVersion: "0x00002468",
          transactionVersion: "0x0000000e",
          address: `${address}`,
          blockHash:
            "0x554d682a74099d05e8b7852d19c93b527b5fae1e9e1969f6e1b82a2f09a14cc9",
          blockNumber: "0x00cb539c",
          era: "0xc501",
          genesisHash:
            "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
          method:
            "0x0001784920616d207369676e696e672074686973207472616e73616374696f6e21",
          nonce: "0x00000000",
          signedExtensions: [
            "CheckNonZeroSender",
            "CheckSpecVersion",
            "CheckTxVersion",
            "CheckGenesis",
            "CheckMortality",
            "CheckNonce",
            "CheckWeight",
            "ChargeTransactionPayment",
          ],
          tip: "0x00000000000000000000000000000000",
          version: 4,
        };

        const result = await client!.request<{
          payload: string;
          signature: string;
        }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
            params: {
              address,
              transactionPayload,
            },
          },
        });

        return {
          method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
          address,
          valid: true,
          result: result.signature,
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const message = `This is an example message to be signed - ${Date.now()}`;

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_MESSAGE,
            params: {
              address,
              message,
            },
          },
        });

        // sr25519 signatures need to wait for WASM to load
        await cryptoWaitReady();
        const { isValid: valid } = signatureVerify(
          message,
          result.signature,
          address
        );

        return {
          method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_MESSAGE,
          address,
          valid,
          result: result.signature,
        };
      }
    ),
  };

  // -------- NEAR RPC METHODS --------

  const nearRpc = {
    testSignAndSendTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const accounts = await client!.request<
          { accountId: string; publicKey: string }[]
        >({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_NEAR_METHODS.NEAR_GET_ACCOUNTS,
            params: {},
          },
        });

        const account = accounts.find(
          (account) => account.accountId === address
        );

        if (!account) {
          console.error("near accounts", accounts);
          throw new Error(`Near Account not found for address: ${address}`);
        }

        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION;

        const provider = new NearApi.providers.JsonRpcProvider({
          url: "https://rpc.testnet.near.org",
        });

        const block = await provider.block({ finality: "final" });
        console.log("block", block);

        const accessKey = await provider.query<AccessKeyView>({
          request_type: "view_access_key",
          finality: "final",
          account_id: address,
          public_key: account?.publicKey,
        });

        const nearTransaction = NearApi.transactions.createTransaction(
          address,
          NearApi.utils.PublicKey.fromString(account?.publicKey),
          "0xgancho.testnet",
          BigInt(accessKey.nonce) + BigInt(1),
          [
            NearApi.transactions.transfer(
              BigInt("1000000000000000000000000") // 0.001 Ⓝ in yoctoNEAR
            ),
          ],
          new Uint8Array(NearApi.utils.serialize.base_decode(block.header.hash))
        );

        console.log("nearTransaction", nearTransaction);

        const result = await client!.request({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transaction: nearTransaction.encode(),
            },
          },
        });

        console.log("result", result);

        return {
          method,
          address,
          valid: true,
          result: JSON.stringify((result as any).transaction.hash),
        };
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const accounts = await client!.request<
          { accountId: string; publicKey: string }[]
        >({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_NEAR_METHODS.NEAR_GET_ACCOUNTS,
            params: {},
          },
        });

        const account = accounts.find(
          (account) => account.accountId === address
        );

        if (!account) {
          console.error("near accounts", accounts);
          throw new Error(`Near Account not found for address: ${address}`);
        }

        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_TRANSACTION;

        const provider = new NearApi.providers.JsonRpcProvider({
          url: "https://rpc.testnet.near.org",
        });

        const block = await provider.block({ finality: "final" });
        console.log("block", block);

        const accessKey = await provider.query<AccessKeyView>({
          request_type: "view_access_key",
          finality: "final",
          account_id: address,
          public_key: account?.publicKey,
        });

        const nearTransaction = NearApi.transactions.createTransaction(
          address,
          NearApi.utils.PublicKey.fromString(account?.publicKey),
          "0xgancho.testnet",
          BigInt(accessKey.nonce) + BigInt(1),
          [
            NearApi.transactions.transfer(
              BigInt("1000000000000000000000000") // 0.001 Ⓝ in yoctoNEAR
            ),
          ],
          new Uint8Array(NearApi.utils.serialize.base_decode(block.header.hash))
        );

        console.log("nearTransaction", nearTransaction);

        const result = await client!.request<{
          data: Object;
          type: string;
        }>({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transaction: nearTransaction.encode(),
            },
          },
        });

        console.log("result", result);

        let buffer = undefined;
        if (Buffer.isBuffer(result)) {
          buffer = result;
        } else if (
          result &&
          result.type === "Buffer" &&
          Array.isArray(result.data)
        ) {
          buffer = Buffer.from(result.data);
        } else {
          throw new Error("Not a Buffer or recognizable Buffer-like object");
        }

        const signedTransaction = NearApi.transactions.SignedTransaction.decode(
          new Uint8Array(buffer)
        );
        console.log("signedTransaction", signedTransaction);

        return {
          method,
          address,
          valid: true,
          result: "see dev console to inspect signedTransaction",
        };
      }
    ),
    testSignAndSendTransactions: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const accounts = await client!.request<
          { accountId: string; publicKey: string }[]
        >({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_NEAR_METHODS.NEAR_GET_ACCOUNTS,
            params: {},
          },
        });

        const account = accounts.find(
          (account) => account.accountId === address
        );

        if (!account) {
          console.error("near accounts", accounts);
          throw new Error(`Near Account not found for address: ${address}`);
        }

        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS;

        const provider = new NearApi.providers.JsonRpcProvider({
          url: "https://rpc.testnet.near.org",
        });

        const block = await provider.block({ finality: "final" });
        console.log("block", block);
        const accessKey = await provider.query<AccessKeyView>({
          request_type: "view_access_key",
          finality: "final",
          account_id: address,
          public_key: account?.publicKey,
        });

        const transactions = [];

        for (let i = 0; i < 2; i++) {
          const nearTransaction = NearApi.transactions.createTransaction(
            address,
            NearApi.utils.PublicKey.fromString(account?.publicKey),
            "0xgancho.testnet",
            BigInt(accessKey.nonce) + BigInt(i) + BigInt(1),
            [
              NearApi.transactions.transfer(
                BigInt("1000000000000000000000000") // 0.001 Ⓝ in yoctoNEAR
              ),
            ],
            new Uint8Array(
              NearApi.utils.serialize.base_decode(block.header.hash)
            )
          );
          console.log(`nearTransaction number: ${i}`, nearTransaction);
          transactions.push(nearTransaction);
        }

        const result = await client!.request({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transactions: transactions.map((transaction) =>
                transaction.encode()
              ),
            },
          },
        });

        console.log("signAndSendTransactions result", result);

        return {
          method,
          address,
          valid: true,
          result: JSON.stringify(
            (result as any).map((r: any) => r.transaction.hash)
          ),
        };
      }
    ),
    testSignTransactions: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const accounts = await client!.request<
          { accountId: string; publicKey: string }[]
        >({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_NEAR_METHODS.NEAR_GET_ACCOUNTS,
            params: {},
          },
        });

        const account = accounts.find(
          (account) => account.accountId === address
        );

        if (!account) {
          console.error("near accounts", accounts);
          throw new Error(`Near Account not found for address: ${address}`);
        }

        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_TRANSACTIONS;

        const provider = new NearApi.providers.JsonRpcProvider({
          url: "https://rpc.testnet.near.org",
        });

        const block = await provider.block({ finality: "final" });
        console.log("block", block);
        const accessKey = await provider.query<AccessKeyView>({
          request_type: "view_access_key",
          finality: "final",
          account_id: address,
          public_key: account?.publicKey,
        });

        const transactions = [];

        for (let i = 0; i < 2; i++) {
          const nearTransaction = NearApi.transactions.createTransaction(
            address,
            NearApi.utils.PublicKey.fromString(account?.publicKey),
            "0xgancho.testnet",
            BigInt(accessKey.nonce) + BigInt(i) + BigInt(1),
            [
              NearApi.transactions.transfer(
                BigInt("1000000000000000000000000") // 0.001 Ⓝ in yoctoNEAR
              ),
            ],
            new Uint8Array(
              NearApi.utils.serialize.base_decode(block.header.hash)
            )
          );
          console.log(`nearTransaction number: ${i}`, nearTransaction);
          transactions.push(nearTransaction);
        }

        const result = await client!.request({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transactions: transactions.map((transaction) =>
                transaction.encode()
              ),
            },
          },
        });

        console.log("signTransactions result", result);

        return {
          method,
          address,
          valid: true,
          result: "see dev console to inspect signedTransactions",
        };
      }
    ),
  };

  // -------- MULTIVERSX RPC METHODS --------

  const multiversxRpc = {
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const reference = chainId.split(":")[1];

        const userAddress = new Address(address);
        const verifier = UserVerifier.fromAddress(userAddress);
        const transactionPayload = new TransactionPayload("testdata");

        const testTransaction = new MultiversxTransaction({
          nonce: 1,
          value: "10000000000000000000",
          receiver: Address.fromBech32(address),
          sender: userAddress,
          gasPrice: 1000000000,
          gasLimit: 50000,
          chainID: reference,
          data: transactionPayload,
        });
        const transaction = testTransaction.toPlainObject();

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTION,
            params: {
              transaction,
            },
          },
        });

        const valid = verifier.verify(
          testTransaction.serializeForSigning(),
          Buffer.from(result.signature, "hex")
        );

        return {
          method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTION,
          address,
          valid,
          result: result.signature.toString(),
        };
      }
    ),
    testSignTransactions: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const reference = chainId.split(":")[1];

        const userAddress = new Address(address);
        const verifier = UserVerifier.fromAddress(userAddress);
        const testTransactionPayload = new TransactionPayload("testdata");

        const testTransaction = new MultiversxTransaction({
          nonce: 1,
          value: "10000000000000000000",
          receiver: Address.fromBech32(address),
          sender: userAddress,
          gasPrice: 1000000000,
          gasLimit: 50000,
          chainID: reference,
          data: testTransactionPayload,
        });

        // no data for this Transaction
        const testTransaction2 = new MultiversxTransaction({
          nonce: 2,
          value: "20000000000000000000",
          receiver: Address.fromBech32(address),
          sender: userAddress,
          gasPrice: 1000000000,
          gasLimit: 50000,
          chainID: reference,
        });

        const testTransaction3Payload = new TransactionPayload("third");
        const testTransaction3 = new MultiversxTransaction({
          nonce: 3,
          value: "300000000000000000",
          receiver: Address.fromBech32(address),
          sender: userAddress,
          gasPrice: 1000000000,
          gasLimit: 50000,
          chainID: reference,
          data: testTransaction3Payload,
        });

        const transactions = [
          testTransaction,
          testTransaction2,
          testTransaction3,
        ].map((transaction) => transaction.toPlainObject());

        const result = await client!.request<{
          signatures: { signature: string }[];
        }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTIONS,
            params: {
              transactions,
            },
          },
        });

        const valid = [
          testTransaction,
          testTransaction2,
          testTransaction3,
        ].reduce((acc, current, index) => {
          return (
            acc &&
            verifier.verify(
              current.serializeForSigning(),
              Buffer.from(result.signatures[index].signature, "hex")
            )
          );
        }, true);

        const resultSignatures = result.signatures.map(
          (signature: any) => signature.signature
        );

        return {
          method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_TRANSACTIONS,
          address,
          valid,
          result: resultSignatures.join(", "),
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const userAddress = new Address(address);
        const verifier = UserVerifier.fromAddress(userAddress);

        const testMessage = new SignableMessage({
          address: userAddress,
          message: Buffer.from(`Sign this message - ${Date.now()}`, "ascii"),
        });

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_MESSAGE,
            params: {
              address,
              message: testMessage.message.toString(),
            },
          },
        });

        const valid = verifier.verify(
          testMessage.serializeForSigning(),
          Buffer.from(result.signature, "hex")
        );

        return {
          method: DEFAULT_MULTIVERSX_METHODS.MULTIVERSX_SIGN_MESSAGE,
          address,
          valid,
          result: result.signature.toString(),
        };
      }
    ),
  };

  // -------- TRON RPC METHODS --------

  const tronRpc = {
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        // Nile TestNet, if you want to use in MainNet, change the fullHost to 'https://api.trongrid.io'
        const fullHost = isTestnet
          ? "https://nile.trongrid.io/"
          : "https://api.trongrid.io/";

        const tronWeb = new TronWeb({
          fullHost,
        });

        // Take USDT as an example:
        // Nile TestNet: https://nile.tronscan.org/#/token20/TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf
        // MainNet: https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

        const testContract = isTestnet
          ? "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
          : "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
        const testTransaction =
          await tronWeb.transactionBuilder.triggerSmartContract(
            testContract,
            "approve(address,uint256)",
            { feeLimit: 200000000 },
            [
              { type: "address", value: address },
              { type: "uint256", value: 0 },
            ],
            address
          );

        const result = await client!.request<{ signature: any }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_TRON_METHODS.TRON_SIGN_TRANSACTION,
            params: {
              address,
              transaction: {
                ...testTransaction,
              },
            },
          },
        });
        console.log("tron sign transaction result", result);

        return {
          method: DEFAULT_TRON_METHODS.TRON_SIGN_TRANSACTION,
          address,
          valid: true,
          result: result.signature,
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const message = "This is a message to be signed for Tron";

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_TRON_METHODS.TRON_SIGN_MESSAGE,
            params: {
              address,
              message,
            },
          },
        });

        return {
          method: DEFAULT_TRON_METHODS.TRON_SIGN_MESSAGE,
          address,
          valid: true,
          result: result.signature,
        };
      }
    ),
  };

  // -------- TEZOS RPC METHODS --------

  const tezosRpc = {
    testGetAccounts: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
            params: {},
          },
        });

        return {
          method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
          address,
          valid: true,
          result: JSON.stringify(result, null, 2),
        };
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const result = await client!.request<{ hash: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
            params: {
              account: address,
              operations: [
                {
                  kind: "transaction",
                  amount: "1", // 1 mutez, smallest unit
                  destination: address, // send to ourselves
                },
              ],
            },
          },
        });

        return {
          method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
          address,
          valid: true,
          result: result.hash,
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const payload = "05010000004254";

        const result = await client!.request<{ signature: string }>({
          chainId,
          topic: session!.topic,
          request: {
            method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
            params: {
              account: address,
              payload,
            },
          },
        });

        return {
          method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
          address,
          valid: true,
          result: result.signature,
        };
      }
    ),
  };

  // -------- KADENA RPC METHODS --------

  const kadenaRpc = {
    testGetAccounts: _createJsonRpcRequestHandler(
      async (
        WCNetworkId: string,
        publicKey: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_KADENA_METHODS.KADENA_GET_ACCOUNTS;

        const result = await client!.request<any>({
          topic: session!.topic,
          chainId: WCNetworkId,
          request: {
            method,
            params: {
              account: `${WCNetworkId}:${publicKey}`,
              contracts: ["coin"],
            },
          },
        });

        // In a real app you would let the user pick which account they want to use. For this example we'll just set it to the first one.
        const [firstAccount] = result.accounts;

        // The information below will later be used to create a transaction
        setKadenaAccount({
          publicKey: firstAccount.publicKey, // Kadena public key
          account: firstAccount.kadenaAccounts[0].name, // Kadena account
          chainId: firstAccount.kadenaAccounts[0].chains[0], // Kadena ChainId
        });

        return {
          method,
          address: publicKey,
          valid: true,
          result: JSON.stringify(result, null, 2),
        };
      }
    ),
    testSign: _createJsonRpcRequestHandler(
      async (
        WCNetworkId: string,
        publicKey: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_KADENA_METHODS.KADENA_SIGN;
        const [_, networkId] = WCNetworkId.split(":");

        if (!kadenaAccount) {
          throw new Error("No Kadena account selected. Call getAccounts first");
        }

        if (!client) {
          throw new Error("No client found");
        }

        const pactCommand = new PactCommand();
        pactCommand.code = `(coin.transfer "${
          kadenaAccount.account
        }" "k:abcabcabcabc" ${new PactNumber(1).toDecimal()})`;

        pactCommand
          .setMeta(
            {
              chainId: kadenaAccount.chainId,
              gasLimit: 1000,
              gasPrice: 1.0e-6,
              ttl: 10 * 60,
              sender: kadenaAccount.account,
            },
            networkId as IPactCommand["networkId"]
          )
          .addCap("coin.GAS", kadenaAccount.publicKey)
          .addCap(
            "coin.TRANSFER",
            kadenaAccount.publicKey, // public key of sender
            kadenaAccount.account, // account of sender
            "k:abcabcabcabc", // account of receiver
            { decimal: `1` } // amount
          );

        const signWithWalletConnect = createWalletConnectSign(
          client as any,
          session as any,
          WCNetworkId as any
        );

        const result = await signWithWalletConnect(pactCommand);

        return {
          method,
          address: kadenaAccount.publicKey,
          valid: true,
          result: JSON.stringify(result, null, 2),
        };
      }
    ),
    testQuicksign: _createJsonRpcRequestHandler(
      async (
        WCNetworkId: string,
        publicKey: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_KADENA_METHODS.KADENA_QUICKSIGN;
        const [_, networkId] = WCNetworkId.split(":");

        if (!kadenaAccount) {
          throw new Error("No Kadena account selected. Call getAccounts first");
        }

        const pactCommand = new PactCommand();
        pactCommand.code = `(coin.transfer "${
          kadenaAccount.account
        }" "k:abcabcabcabc" ${new PactNumber(1).toDecimal()})`;

        pactCommand
          .setMeta(
            {
              chainId: kadenaAccount.chainId,
              gasLimit: 1000,
              gasPrice: 1.0e-6,
              ttl: 10 * 60,
              sender: kadenaAccount.account,
            },
            networkId as IPactCommand["networkId"]
          )
          .addCap("coin.GAS", publicKey)
          .addCap(
            "coin.TRANSFER",
            publicKey, // pubKey of sender
            kadenaAccount.account, // account of sender
            "k:abcabcabcabc", // account of receiver
            { decimal: `1` } // amount
          );

        const quicksignWithWalletConnect = createWalletConnectQuicksign(
          client as any,
          session as any,
          WCNetworkId as any
        );

        const result = await quicksignWithWalletConnect(pactCommand);

        return {
          method,
          address: publicKey,
          valid: true,
          result: JSON.stringify(result, null, 2),
        };
      }
    ),
  };

  const bip122Rpc = {
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        console.log("testSignMessage", chainId, address);
        const method = DEFAULT_BIP122_METHODS.BIP122_SIGN_MESSAGE;
        const message = "This is a message to be signed for BIP122";
        const shouldAddAddress = address !== getAddressFromAccount(accounts[0]);
        const result = await client!.request<{
          signature: string;
          address: string;
        }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: {
              message,
              account: getAddressFromAccount(accounts[0]),
              address: shouldAddAddress ? address : undefined,
            },
          },
        });

        return {
          method,
          address: address,
          valid: await isValidBip122Signature(
            address,
            result.signature,
            message
          ),
          result: result.signature,
        };
      }
    ),
    testSendTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_BIP122_METHODS.BIP122_SEND_TRANSACTION;

        const utxos = await apiGetAddressUtxos(address, chainId);
        console.log("utxos", utxos);
        const availableBalance = getAvailableBalanceFromUtxos(utxos); // in satoshis
        console.log("availableBalance", availableBalance);
        const req = {
          account: address,
          recipientAddress: address,
          amount: BIP122_DUST_LIMIT,
        };
        console.log("request", {
          method,
          params: req,
          chainId,
        });

        const result = await client!.request<{ txid: string }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: req,
          },
        });
        console.log("result", result);
        return {
          method,
          address: address,
          valid: true,
          result: result?.txid,
        };
      }
    ),
    testSignPsbt: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_BIP122_METHODS.BIP122_SIGN_PSBT;

        const network = isBip122Testnet(chainId)
          ? bitcoin.networks.testnet
          : bitcoin.networks.bitcoin;

        console.log("network", isBip122Testnet(chainId), network);
        const utxos = (await apiGetAddressUtxos(address, chainId)) as IUTXO[];
        if (!utxos || utxos.length === 0) {
          throw new Error("No UTXOs found for address: " + address);
        }

        const availableBalance = getAvailableBalanceFromUtxos(utxos); // in satoshis
        const satoshisToTransfer = parseInt(BIP122_DUST_LIMIT, 10);
        if (availableBalance < satoshisToTransfer) {
          throw new Error(
            "Insufficient balance: " + availableBalance + " satoshis"
          );
        }

        const psbt = new bitcoin.Psbt({ network });

        const utxosToSpend: any[] = [];
        let utxosValue = 0;
        utxos.forEach((utxo) => {
          utxosValue += utxo.value;
          utxosToSpend.push(utxo);
          if (utxosValue >= satoshisToTransfer) {
            return;
          }
        });
        const signInputs: unknown[] = [];

        utxosToSpend.forEach((utxo, index) => {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: bitcoin.address.toOutputScript(address, network),
              value: utxo.value,
            },
          });
          signInputs.push({
            address,
            index,
            sighashTypes: [bitcoin.Transaction.SIGHASH_ALL],
          });
        });

        const change = calculateChange(utxosToSpend, satoshisToTransfer, 5);
        if (change > 0) {
          psbt.addOutput({
            address: address,
            value: change,
          });
        }

        psbt.addOutput({
          address: address,
          value: satoshisToTransfer,
        });

        const transaction = psbt.toBase64();

        console.log("availableBalance", availableBalance);
        const req = {
          account: address,
          psbt: transaction,
          signInputs,
          broadcast: false,
        };
        console.log("signPsbt", {
          method,
          params: req,
          chainId,
        });

        const result = await client!.request<{ psbt: string }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: req,
          },
        });
        console.log("result", result);
        const reconstructed = bitcoin.Psbt.fromBase64(result.psbt, { network });
        return {
          method,
          address: address,
          valid: true,
          result: reconstructed.extractTransaction().toHex(),
        };
      }
    ),
    testGetAccountAddresses: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_BIP122_METHODS.BIP122_GET_ACCOUNT_ADDRESSES;
        const isOrdinal = isOrdinalAddress(address);
        const req = {
          account: address,
          intentions: isOrdinal ? ["ordinal"] : ["payment"],
        };
        const addresses =
          session?.sessionProperties?.[
            `bip122_${DEFAULT_BIP122_METHODS.BIP122_GET_ACCOUNT_ADDRESSES}`
          ];
        let result;
        if (addresses) {
          console.log("cached addresses", addresses);
          const parsed = JSON.parse(addresses as string);
          result = isOrdinal ? parsed.ordinal : parsed.payment;
          console.log("parsed", result);
        } else {
          console.log("request", {
            method,
            params: req,
            chainId,
          });

          result = await client!.request<any>({
            topic: session!.topic,
            chainId: chainId,
            request: {
              method,
              params: req,
            },
          });

          console.log("result", result);
        }

        const accounts = result.map((r: any) => `${chainId}:${r.address}`);
        setAccounts((prev: string[]) => [...new Set([...prev, ...accounts])]);

        return {
          method,
          address: address,
          valid: true,
          result: result.map((r: any) => r.address).join(", "),
        };
      }
    ),
  };

  const stacksRpc = {
    testSendTransfer: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_STACKS_METHODS.STACKS_SEND_TRANSFER;

        const recipient = prompt("Enter the recipient address");

        if (!recipient) {
          throw new Error("Recipient address is required");
        }

        const request = {
          sender: address,
          recipient: recipient?.trim(),
          amount: "10000",
        };
        console.log("request", {
          method,
          params: request,
          chainId,
        });

        const result = await client!.request<{ txid: string }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: request,
          },
        });

        console.log("stacks send transfer result", result);

        return {
          method,
          address: address,
          valid: true,
          result: result.txid,
        };
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_STACKS_METHODS.STACKS_SIGN_MESSAGE;
        const message = "This is a message to be signed for Stacks";
        const network = chainId === "stacks:1" ? "mainnet" : "testnet";
        const result = await client!.request<{ signature: string }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: {
              message,
              address,
            },
          },
        });

        console.log("stacks sign message result", result);
        const hash = Buffer.from(sha256(message)).toString("hex");
        const pubKey = publicKeyFromSignatureRsv(hash, result.signature);

        console.log(
          "isValid",
          getAddressFromPublicKey(pubKey, network),
          address
        );

        if (getAddressFromPublicKey(pubKey, network) !== address) {
          console.error(
            `Signing failed, expected address: ${address}, got: ${getAddressFromPublicKey(
              pubKey,
              network
            )}`
          );
        }

        return {
          method,
          address: address,
          valid: getAddressFromPublicKey(pubKey, network) === address,
          result: result.signature,
        };
      }
    ),
  };

  const suiRpc = {
    testSendSuiTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_SUI_METHODS.SUI_SIGN_AND_EXECUTE_TRANSACTION;
        const recipient = prompt(
          "Enter the recipient address or leave blank to send to yourself"
        );
        const tx = new SuiTransaction();
        const [coin] = tx.splitCoins(tx.gas, [100]); // 0.001 SUI
        tx.setSender(address);
        tx.transferObjects([coin], recipient?.trim() || address);

        const suiClient = getSuiClient(chainId);
        const bcsTransaction = await tx.build({ client: suiClient });

        const req = {
          transaction: Buffer.from(bcsTransaction).toString("base64"),
          address,
        };

        console.log("req", req, Buffer.from(bcsTransaction).toString("base64"));
        const result = await client!.request<{ digest: string }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: req,
          },
        });
        console.log("result", result);
        return {
          method,
          address: address,
          valid: true,
          result: result?.digest,
        };
      }
    ),
    testSignSuiTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_SUI_METHODS.SUI_SIGN_TRANSACTION;

        const tx = new SuiTransaction();

        const [coin] = tx.splitCoins(tx.gas, [100]); // 0.001 SUI

        tx.setSender(address);

        tx.transferObjects([coin], address);

        const suiClient = getSuiClient(chainId);

        const bcsTransaction = await tx.build({ client: suiClient });

        const req = {
          transaction: Buffer.from(bcsTransaction).toString("base64"),
          address,
        };

        console.log("req", req, Buffer.from(bcsTransaction).toString("base64"));
        const result = await client!.request<{
          signature: string;
          transactionBytes: string;
        }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: req,
          },
        });
        console.log("result", result);

        const isValid = await verifyTransactionSignature(
          new Uint8Array(Buffer.from(result.transactionBytes, "base64")),
          result.signature
        );

        console.log("isValid", isValid);

        return {
          method,
          address: address,
          valid: true,
          result: result?.signature,
        };
      }
    ),
    testSignSuiPersonalMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_SUI_METHODS.SUI_SIGN_PERSONAL_MESSAGE;
        const req = {
          address: address,
          message: "This is a message to be signed for SUI",
        };
        console.log("req", req);
        const result = await client!.request<{
          signature: string;
          publicKey: string;
        }>({
          topic: session!.topic,
          chainId: chainId,
          request: {
            method,
            params: req,
          },
        });

        console.log(
          "result",
          result,
          Buffer.from(result.signature, "base64").toString("hex")
        );
        try {
          const publicKey = await verifyPersonalMessageSignature(
            new TextEncoder().encode(req.message),
            result.signature,
            { address }
          );

          console.log("publicKey", publicKey.toSuiAddress(), address);
          return {
            method,
            address: address,
            valid:
              publicKey.toSuiAddress().toLowerCase() === address.toLowerCase(),
            result: result?.signature,
          };
        } catch (error) {
          console.error(error);
          return {
            method,
            address: address,
            valid: false,
            result: (error as Error).message,
          };
        }
      }
    ),
  };

  return (
    <JsonRpcContext.Provider
      value={{
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
        rpcResult: result,
        isRpcRequestPending: pending,
        isTestnet,
        setIsTestnet,
        bip122Rpc,
        suiRpc,
        stacksRpc,
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
