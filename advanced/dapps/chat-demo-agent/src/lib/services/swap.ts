import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

export interface SwapParams {
  src: `0x${string}`;
  dst: `0x${string}`;
  amount: string;
  from: `0x${string}`;
  slippage: number;
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

interface AllowanceResponse {
  allowance: string;
}

interface ApprovalTransaction {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  gas: bigint;
}

interface SwapTransactionResponse {
  tx: {
    from: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    gas: number;
    gasPrice:string
  };
}

class ApiError extends Error {
  constructor(message: string, public status: number, public path: string) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class SwapError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SwapError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const CHAIN_ID = base.id;

const client = createWalletClient({
  chain: base,
  transport: http(),
});

async function callApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams(params);
  const apiPath = `https://api.1inch.dev/swap/v6.0/${CHAIN_ID}${path}`;
  const API_KEY = process.env.ONEINCH_API_KEY;

  if (!API_KEY) {
    throw new ApiError('API Key not configured', 500, path);
  }

  const url = queryParams.toString() ? `${apiPath}?${queryParams}` : apiPath;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorMessage = await response.text().catch(() => response.statusText);
      throw new ApiError(errorMessage, response.status, path);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch data from API', 500, path);
  }
}

export async function checkAllowance(tokenAddress: string, walletAddress: string): Promise<string> {
  try {
    const data = await callApi<AllowanceResponse>('/approve/allowance', { tokenAddress, walletAddress });
    return data.allowance;
  } catch (error) {
    throw new SwapError(`Failed to check allowance for token ${tokenAddress}`, error);
  }
}

export async function buildApprovalTransaction(tokenAddress: string, amount?: string): Promise<ApprovalTransaction> {
  try {
    const params: Record<string, string> = { tokenAddress, ...(amount && { amount }) };
    const transaction = await callApi<ApprovalTransaction>('/approve/transaction', params);

    const gasEstimate = await client.prepareTransactionRequest({
      ...transaction,
      account: transaction.from,
    });

    return {
      ...transaction,
      gas: gasEstimate.gas ?? BigInt(0),
    };
  } catch (error) {
    throw new SwapError(`Failed to build approval transaction for token ${tokenAddress}`, error);
  }
}

export async function buildSwapTransaction(swapParams: SwapParams): Promise<SwapTransactionResponse> {
  try {
    const data = await callApi<SwapTransactionResponse>('/swap', swapParams as unknown as Record<string, string>);
    return data;
  } catch (error) {
    throw new SwapError('Failed to build swap transaction', error);
  }
}

export async function getSwapTransaction(swapParams: SwapParams): Promise<SwapTransactionResponse> {
  try {
    // Optional: Check allowance if required before swap
    // const allowance = await checkAllowance(swapParams.src, swapParams.from);
    // if (BigInt(allowance) < BigInt(swapParams.amount)) {
    //   await buildApprovalTransaction(swapParams.src);
    // }

    const swapTx = await buildSwapTransaction(swapParams);
    return swapTx;
  } catch (error) {
    if (error instanceof SwapError || error instanceof ApiError) {
      throw error;
    }
    throw new SwapError('Unexpected error occurred during the swap', error);
  }
}
