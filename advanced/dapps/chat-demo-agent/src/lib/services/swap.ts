import { createWalletClient, http, Transaction, Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Types and Interfaces
export interface SwapParams {
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: number;
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

interface ApiResponse<T> {
  data: T;
  status: number;
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
  tx: Transaction;
}

// Custom Error Classes
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class SwapError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SwapError';
  }
}

// Configuration
const CHAIN_ID = base.id;

// Initialize Viem client
const client = createWalletClient({
  chain: base,
  transport: http()
});

// Helper function to call the proxy API with proper typing
async function callApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    ...params,
    path: `/swap/v6.0/${CHAIN_ID}${path}`
  });

  try {
    const response = await fetch(`/api/inch?${queryParams}`);
    
    if (!response.ok) {
      throw new ApiError(
        response.statusText,
        response.status,
        path
      );
    }

    const data: ApiResponse<T> = await response.json();
    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Failed to fetch data from API',
      500,
      path
    );
  }
}

// Check token allowance
export async function checkAllowance(
  tokenAddress: string,
  walletAddress: string
): Promise<string> {
  try {
    const data = await callApi<AllowanceResponse>('/approve/allowance', {
      tokenAddress,
      walletAddress
    });
    return data.allowance;
  } catch (error) {
    throw new SwapError(
      `Failed to check allowance for token ${tokenAddress}`,
      error
    );
  }
}

// Build approval transaction
export async function buildApprovalTransaction(
  tokenAddress: string,
  amount?: string
): Promise<ApprovalTransaction> {
  try {
    const params: Record<string, string> = { tokenAddress };
    if (amount) {
      params.amount = amount;
    }

    const transaction = await callApi<ApprovalTransaction>('/approve/transaction', params);
    console.log("buildApprovalTransaction: ", { transaction });

    const gasEstimate = await client.prepareTransactionRequest({
      ...transaction,
      account: transaction.from as `0x${string}`,
    });

    return {
      ...transaction,
      gas: gasEstimate.gas ?? BigInt(0)
    };
  } catch (error) {
    throw new SwapError(
      `Failed to build approval transaction for token ${tokenAddress}`,
      error
    );
  }
}

// Build swap transaction
export async function buildSwapTransaction(
  swapParams: SwapParams
): Promise<Transaction> {
  try {
    const data = await callApi<SwapTransactionResponse>('/swap', swapParams as unknown as Record<string, string>);
    return data.tx;
  } catch (error) {
    throw new SwapError(
      'Failed to build swap transaction',
      error
    );
  }
}

// Main swap function
export async function performTokenSwap(
  swapParams: SwapParams,
  privateKey: string,
): Promise<{ success: boolean; txHash?: Hash }> {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const allowance = await checkAllowance(swapParams.src, swapParams.from);
    console.log('Current allowance:', allowance);

    if (BigInt(allowance) < BigInt(swapParams.amount)) {
      console.log('Insufficient allowance, creating approval transaction...');
      const approvalTx = await buildApprovalTransaction(swapParams.src);
      // Approval transaction execution commented as requested
    }

    console.log('Building swap transaction...');
    const swapTx = await buildSwapTransaction(swapParams);
    console.log('Swap transaction:', { swapTx });
    // Swap transaction execution commented as requested
    
    return {
      success: true
    };

  } catch (error) {
    console.error('Error performing swap:', error);
    if (error instanceof SwapError || error instanceof ApiError) {
      throw error;
    }
    throw new SwapError(
      'An unexpected error occurred during the swap',
      error
    );
  }
}