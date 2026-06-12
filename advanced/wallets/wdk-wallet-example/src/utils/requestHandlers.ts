/**
 * WalletConnect session_request handling.
 *
 * All signing keys come from WDK. EVM requests are served directly through
 * WDK's account API. Solana and TON requests carry pre-serialized payloads that
 * WDK's high-level API can't ingest, so we bridge them onto WDK's raw key pair
 * via small per-chain signers (see src/lib/solanaSigner.ts, src/lib/tonSigner.ts).
 */
import { formatJsonRpcError, formatJsonRpcResult } from "@json-rpc-tools/utils";
import { getSdkError } from "@walletconnect/utils";
import { SignClientTypes } from "@walletconnect/types";
import {
  getEvmAccount,
  getSolanaAccount,
  getTonAccount,
} from "@/lib/WDKWallet";
import { SolanaSigner } from "@/lib/solanaSigner";
import { TonSigner } from "@/lib/tonSigner";
import { walletkit } from "@/utils/walletConnect";

type RequestEvent = SignClientTypes.EventArguments["session_request"];

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function hexToUtf8(value: string): string {
  if (typeof value === "string" && value.startsWith("0x")) {
    return Buffer.from(value.slice(2), "hex").toString("utf8");
  }
  return value;
}

/** personal_sign / eth_sign pass [message, address] (order varies). */
function getMessageFromParams(params: string[]): string {
  const raw = params.find((param) => !ADDRESS_RE.test(param)) ?? params[0];
  return hexToUtf8(raw);
}

function toBigInt(value?: string | number): bigint | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return BigInt(value);
}

/** Maps a WalletConnect eth_sendTransaction/eth_signTransaction param to a WDK EvmTransaction. */
function mapEvmTransaction(raw: any, caip2: string) {
  const tx: Record<string, unknown> = {
    to: raw.to,
    value: toBigInt(raw.value) ?? 0n,
    chainId: Number(caip2.split(":")[1]),
  };
  if (raw.data && raw.data !== "0x") tx.data = raw.data;
  const gasLimit = toBigInt(raw.gas ?? raw.gasLimit);
  if (gasLimit !== undefined) tx.gasLimit = gasLimit;
  const gasPrice = toBigInt(raw.gasPrice);
  if (gasPrice !== undefined) tx.gasPrice = gasPrice;
  const maxFeePerGas = toBigInt(raw.maxFeePerGas);
  if (maxFeePerGas !== undefined) tx.maxFeePerGas = maxFeePerGas;
  const maxPriorityFeePerGas = toBigInt(raw.maxPriorityFeePerGas);
  if (maxPriorityFeePerGas !== undefined)
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
  if (raw.nonce !== undefined) tx.nonce = Number(raw.nonce);
  return tx as any;
}

async function approveEvmRequest(event: RequestEvent) {
  const { params, id } = event;
  const { chainId, request } = params;
  const account = await getEvmAccount(chainId);

  switch (request.method) {
    case "personal_sign":
    case "eth_sign": {
      const message = getMessageFromParams(request.params);
      return formatJsonRpcResult(id, await account.sign(message));
    }

    case "eth_signTypedData":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      const rawData = request.params.find(
        (param: string) => !ADDRESS_RE.test(param),
      );
      const typedData =
        typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      const { EIP712Domain, ...types } = typedData.types ?? {};
      const signature = await account.signTypedData({
        domain: typedData.domain,
        types,
        message: typedData.message,
      });
      return formatJsonRpcResult(id, signature);
    }

    case "eth_signTransaction": {
      const tx = mapEvmTransaction(request.params[0], chainId);
      return formatJsonRpcResult(id, await account.signTransaction(tx));
    }

    case "eth_sendTransaction": {
      const tx = mapEvmTransaction(request.params[0], chainId);
      const { hash } = await account.sendTransaction(tx);
      return formatJsonRpcResult(id, hash);
    }

    default:
      return formatJsonRpcError(id, getSdkError("INVALID_METHOD").message);
  }
}

async function approveSolanaRequest(event: RequestEvent) {
  const { params, id } = event;
  const { chainId, request } = params;

  const account = await getSolanaAccount();
  const seed = account.keyPair.privateKey;
  if (!seed) throw new Error("Solana private key is unavailable");
  const signer = SolanaSigner.fromSeed(seed);

  switch (request.method) {
    case "solana_signMessage":
      return formatJsonRpcResult(id, signer.signMessage(request.params));

    case "solana_signTransaction":
      return formatJsonRpcResult(id, signer.signTransaction(request.params));

    case "solana_signAndSendTransaction":
      return formatJsonRpcResult(
        id,
        await signer.signAndSendTransaction(request.params, chainId),
      );

    case "solana_signAllTransactions":
      return formatJsonRpcResult(
        id,
        signer.signAllTransactions(request.params),
      );

    default:
      return formatJsonRpcError(id, getSdkError("INVALID_METHOD").message);
  }
}

async function approveTonRequest(event: RequestEvent) {
  const { topic, params, id } = event;
  const { chainId, request } = params;

  const account = await getTonAccount();
  const signer = TonSigner.fromWdkKeyPair(account.keyPair);

  switch (request.method) {
    case "ton_sendMessage": {
      const payload = Array.isArray(request.params)
        ? request.params[0]
        : request.params;
      return formatJsonRpcResult(
        id,
        await signer.sendMessage(payload, chainId),
      );
    }

    case "ton_signData": {
      const payload = Array.isArray(request.params)
        ? request.params[0]
        : request.params;
      let domain = "";
      try {
        const session = walletkit.engine.signClient.session.get(topic);
        domain = new URL(session.peer.metadata.url).hostname;
      } catch {
        // best-effort domain; sign with empty domain if metadata is unavailable
      }
      return formatJsonRpcResult(
        id,
        await signer.signData(payload, domain, chainId),
      );
    }

    default:
      return formatJsonRpcError(id, getSdkError("INVALID_METHOD").message);
  }
}

/** Routes an approved request to the correct chain handler. */
export async function approveRequest(event: RequestEvent) {
  const namespace = event.params.chainId.split(":")[0];
  try {
    switch (namespace) {
      case "eip155":
        return await approveEvmRequest(event);
      case "solana":
        return await approveSolanaRequest(event);
      case "ton":
        return await approveTonRequest(event);
      default:
        return formatJsonRpcError(
          event.id,
          getSdkError("UNSUPPORTED_CHAINS").message,
        );
    }
  } catch (error) {
    console.error("Failed to handle request", error);
    return formatJsonRpcError(event.id, (error as Error).message);
  }
}

export function rejectRequest(event: RequestEvent) {
  return formatJsonRpcError(event.id, getSdkError("USER_REJECTED").message);
}
