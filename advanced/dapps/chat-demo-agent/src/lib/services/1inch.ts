import { base } from 'viem/chains';
import { createWalletClient, http } from 'viem';
import { AppError, ErrorCodes } from '@/errors/api-errors';
import type { 
  AllowanceResponse, 
  ApprovalTransaction, 
  SwapParams,
  SwapTransactionResponse 
} from '@/types/1inch';

export class OneInchApiService {
  private static instance: OneInchApiService;
  private readonly chainId: number;
  private readonly client;
  private readonly apiKey: string;

  private constructor() {
    const apiKey = process.env.ONEINCH_API_KEY;
    if (!apiKey) {
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR,
        'ONEINCH_API_KEY is not configured'
      );
    }
    
    this.apiKey = apiKey;
    this.chainId = base.id;
    this.client = createWalletClient({
      chain: base,
      transport: http(),
    });
  }

  public static getInstance(): OneInchApiService {
    if (!OneInchApiService.instance) {
      OneInchApiService.instance = new OneInchApiService();
    }
    return OneInchApiService.instance;
  }

  private async callApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const queryParams = new URLSearchParams(params);
    const apiPath = `https://api.1inch.dev/swap/v6.0/${this.chainId}${path}`;
    const url = queryParams.toString() ? `${apiPath}?${queryParams}` : apiPath;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessage = await response.text().catch(() => response.statusText);
        throw new AppError(ErrorCodes.SWAP_EXECUTION_ERROR, errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.SWAP_EXECUTION_ERROR, 'Failed to fetch data from 1Inch API');
    }
  }

  async checkAllowance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const data = await this.callApi<AllowanceResponse>('/approve/allowance', { 
        tokenAddress, 
        walletAddress 
      });
      return data.allowance;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR, 
        `Failed to check allowance for token ${tokenAddress}`, 
      );
    }
  }

  async buildApprovalTransaction(tokenAddress: string, amount?: string): Promise<ApprovalTransaction> {
    try {
      const params: Record<string, string> = { 
        tokenAddress, 
        ...(amount && { amount }) 
      };
      
      const transaction = await this.callApi<ApprovalTransaction>('/approve/transaction', params);

      const gasEstimate = await this.client.prepareTransactionRequest({
        ...transaction,
        account: transaction.from,
      });

      return {
        ...transaction,
        gas: gasEstimate.gas ?? BigInt(0),
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR, 
        `Failed to build approval transaction for token ${tokenAddress}`, 
      );
    }
  }

  async buildSwapTransaction(swapParams: SwapParams): Promise<SwapTransactionResponse> {
    try {
      return await this.callApi<SwapTransactionResponse>(
        '/swap', 
        swapParams as unknown as Record<string, string>
      );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR, 
        'Failed to build swap transaction', 
      );
    }
  }
}
