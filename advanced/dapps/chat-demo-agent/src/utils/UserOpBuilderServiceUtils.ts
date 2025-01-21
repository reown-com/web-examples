import { bigIntReplacer } from "../utils/CommonUtils";
import type { Address, Hex } from "viem";
import { USEROP_BUILDER_SERVICE_BASE_URL } from "./ConstantsUtil";

export type Call = { to: Address; value: bigint; data: Hex };

export type UserOperationWithBigIntAsHex = {
  sender: Address;
  nonce: Hex;
  factory: Address | undefined;
  factoryData: Hex | undefined;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymaster: Address | undefined;
  paymasterVerificationGasLimit: Hex | undefined;
  paymasterPostOpGasLimit: Hex | undefined;
  paymasterData: Hex | undefined;
  signature: Hex;
  initCode?: never;
  paymasterAndData?: never;
};

/**
 * UserOperation v0.7
 */
export type UserOperation = {
  sender: Address;
  nonce: bigint;
  factory?: Address;
  factoryData?: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymaster?: Address;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
  paymasterData?: Hex;
  signature: Hex;
  initCode?: never;
  paymasterAndData?: never;
};

export type ErrorResponse = {
  message: string;
  error: string;
};

export type PrepareCallsParams = {
  from: `0x${string}`;
  chainId: `0x${string}`;
  calls: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: `0x${string}`;
  }[];
  capabilities: Record<string, unknown>;
};

export type PrepareCallsReturnValue = {
  preparedCalls: {
    type: string;
    data: unknown;
    chainId: `0x${string}`;
  };
  signatureRequest: {
    hash: `0x${string}`;
  };
  context: string;
};

export type SendPreparedCallsParams = {
  preparedCalls: {
    type: string;
    data: unknown;
    chainId: `0x${string}`;
  };
  signature: `0x${string}`;
  context: string;
};

export type SendPreparedCallsReturnValue = string;
export type GetCallsStatusParams = string;
export type GetCallsStatusReturnValue = {
  status: "PENDING" | "CONFIRMED";
  receipts?: {
    logs: {
      address: `0x${string}`;
      data: `0x${string}`;
      topics: `0x${string}`[];
    }[];
    status: `0x${string}`; // Hex 1 or 0 for success or failure, respectively
    blockHash: `0x${string}`;
    blockNumber: `0x${string}`;
    gasUsed: `0x${string}`;
    transactionHash: `0x${string}`;
  }[];
};

// Define a custom error type
export class UserOpBuilderApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "UserOpBuilderApiError";
  }
}

async function jsonRpcRequest<TParams, TResult>(
  method: string,
  params: TParams,
  url: string,
): Promise<TResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        jsonrpc: "2.0",
        id: "1",
        method,
        params,
      },
      bigIntReplacer,
    ),
  });

  if (!response.ok) {
    throw new UserOpBuilderApiError(response.status, await response.text());
  }

  const data = await response.json();

  if ("error" in data) {
    throw new UserOpBuilderApiError(500, JSON.stringify(data.error));
  }

  return data.result; // Return the result if successful
}

export async function prepareCalls(
  args: PrepareCallsParams,
): Promise<PrepareCallsReturnValue[]> {
  const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
  }
  const url = `${USEROP_BUILDER_SERVICE_BASE_URL}?projectId=${projectId}`;

  return jsonRpcRequest<PrepareCallsParams[], PrepareCallsReturnValue[]>(
    "wallet_prepareCalls",
    [args],
    url,
  );
}

export async function sendPreparedCalls(
  args: SendPreparedCallsParams,
): Promise<SendPreparedCallsReturnValue[]> {
  const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
  }
  const url = `${USEROP_BUILDER_SERVICE_BASE_URL}?projectId=${projectId}`;

  return jsonRpcRequest<
    SendPreparedCallsParams[],
    SendPreparedCallsReturnValue[]
  >("wallet_sendPreparedCalls", [args], url);
}

export async function getCallsStatus(
  args: GetCallsStatusParams
): Promise<GetCallsStatusReturnValue> {
  const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
  }

  const url = `${USEROP_BUILDER_SERVICE_BASE_URL}?projectId=${projectId}`;

  return await jsonRpcRequest<
    GetCallsStatusParams[],
    GetCallsStatusReturnValue
  >("wallet_getCallsStatus", [args], url);
}

