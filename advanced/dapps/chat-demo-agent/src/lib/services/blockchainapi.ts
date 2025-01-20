import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { AppError, ErrorCodes } from '@/errors/api-errors';

interface ConvertRequestBody {
  projectId: string;
  userAddress: string;
  from: string;         // CAIP-10 address
  to: string;          // CAIP-10 address
  amount: string;
  eip155?: {
    slippage: number;
    permit?: unknown;  // EIP-2612 gasless approvals
  };
}

interface ConvertTransactionResponse {
  tx: {
    from: string;
    to: string;
    data: string;
    amount: string;
    value: string;
    eip155?: {
      gas: bigint;
      gasPrice: bigint;
    };
  };
}

export class ConvertTransactionService {
  private static instance: ConvertTransactionService;
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly client;

  private constructor() {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
    const baseUrl = 'https://rpc.walletconnect.org';

    if (!projectId) {
      throw new AppError(
        ErrorCodes.CONFIGURATION_ERROR,
        'PROJECT_ID is not configured'
      );
    }

    if (!baseUrl) {
      throw new AppError(
        ErrorCodes.CONFIGURATION_ERROR,
        'API_BASE_URL is not configured'
      );
    }

    this.projectId = projectId;
    this.baseUrl = baseUrl;
    this.client = createWalletClient({
      chain: base,
      transport: http(),
    });
  }

  public static getInstance(): ConvertTransactionService {
    if (!ConvertTransactionService.instance) {
      ConvertTransactionService.instance = new ConvertTransactionService();
    }
    return ConvertTransactionService.instance;
  }

  async buildTransaction(params: Omit<ConvertRequestBody, 'projectId'>): Promise<ConvertTransactionResponse> {
    try {
      // Validate slippage if provided
      if (params.eip155?.slippage && params.eip155.slippage > 50) {
        throw new AppError(
          ErrorCodes.SWAP_EXECUTION_ERROR, 
          'Slippage cannot exceed 50'
        );
      }
      const response = await fetch(`${this.baseUrl}/v1/convert/build-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new AppError(
            ErrorCodes.SWAP_EXECUTION_ERROR, 
            'Invalid parameters provided for swap transaction'
          );
        }
        
        if (response.status === 401) {
          throw new AppError(
            ErrorCodes.UNAUTHORIZED,
            'Project ID verification failed'
          );
        }

        const errorText = await response.text().catch(() => 'Unknown error');
        throw new AppError(
          ErrorCodes.SWAP_EXECUTION_ERROR, 
          `API request failed: ${errorText}`
        );
      }

      const data = await response.json() as ConvertTransactionResponse;

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR, 
        'Failed to build convert transaction'
      );
    }
  }
}