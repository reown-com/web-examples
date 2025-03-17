import { parseEther } from 'viem';
import { executeActionsWithECDSAKey } from '@/utils/ERC7715PermissionsAsyncUtils';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';
import { SWAP_CONFIG } from '@/config/constants';
import { ChainUtil } from '@/utils/ChainUtil';
import { SwapReceipt, SwapResponse } from '@/types/api';
// import { OneInchApiService } from './1inch';
import type { SwapParams } from '@/types/1inch';
import { AppError, ErrorCodes } from '@/errors/api-errors';
import { getCallsStatus } from '@/utils/UserOpBuilderServiceUtils';
import { ConvertTransactionService } from './blockchainapi';

export class SwapService {
  private static async prepareSwapTransaction(swapParams: SwapParams) {
    // const oneInchApi = OneInchApiService.getInstance();
    // return await oneInchApi.buildSwapTransaction(swapParams);

    const convertService = ConvertTransactionService.getInstance()
    const data = await convertService.buildTransaction({
      amount: swapParams.amount,
      from: `eip155:8453:${swapParams.src}`,
      to: `eip155:8453:${swapParams.dst}`,
      userAddress: `eip155:8453:${swapParams.from}`,
      eip155:{
        slippage: swapParams.slippage
      }
    })
    return data;

  }

  static async executeSwap(
    permissions: SmartSessionGrantPermissionsResponse,
    ethAmount: string
  ): Promise<SwapResponse> {
    const amount = parseEther(ethAmount || SWAP_CONFIG.AMOUNT_ETH);
    
    if(amount > parseEther('0.001')){
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR,
        'Amount must be less than 0.001 ETH'
      );
    }
    const swapParams: SwapParams = {
      src: SWAP_CONFIG.ETH_ADDRESS,
      dst: SWAP_CONFIG.USDC_ADDRESS,
      amount: amount.toString(10),
      from: permissions.address,
      slippage: SWAP_CONFIG.DEFAULT_SLIPPAGE,
      disableEstimate: false,
      allowPartialFill: false
    };

    const chain = ChainUtil.getValidatedChain(permissions.chainId);
    const privateKey = process.env.APPLICATION_PRIVATE_KEY as `0x${string}`;
    
    if (!privateKey) {
      throw new AppError(
        ErrorCodes.SWAP_EXECUTION_ERROR,
        'APPLICATION_PRIVATE_KEY is not set'
      );
    }

    const swapTransaction = await this.prepareSwapTransaction(swapParams);
    const calls = [{
      to: swapTransaction.tx.to.split(':')[2] as `0x${string}`,
      data: swapTransaction.tx.data  as `0x${string}`,
      value: BigInt(amount.toString(10)),
    }];
    const userOpHash = await executeActionsWithECDSAKey({
      actions: calls,
      ecdsaPrivateKey: privateKey,
      chain,
      accountAddress: swapParams.from,
      permissionsContext: permissions.context
    });
    try {
      const receipt = await handleFetchReceipt(userOpHash);
      const txHash = receipt.receipts?.[0]?.transactionHash;
      
      return {
        message: `Successfully swapped ${ethAmount} ETH to USDC`,
        status: receipt.receipts?.[0]?.status === '0x1' ? 'success' : 'error',
        userOpHash,
        txLink: txHash ? `https://basescan.org/tx/${txHash}` : '',
        amount: ethAmount
      };
    } catch (error) {
      if (error instanceof AppError && error.code === ErrorCodes.TIMEOUT_ERROR) {
        // Return a response with the known information when timeout occurs
        return {
          message: `Swap initiated for ${ethAmount} ETH to USDC. Transaction is still processing.`,
          status: 'pending',
          userOpHash,
          amount: ethAmount,
          txLink: ''
        };
      }
      throw error; // Re-throw other errors
    }
  }

  static async getSwapReceipt(userOpHash: string): Promise<SwapReceipt> {
    try {
      const receipt = await handleFetchReceipt(userOpHash);
      
      if (receipt.status === "CONFIRMED") {
        return {
          message: "Swap completed successfully",
          userOpHash,
          txLink: receipt.receipts ? `https://basescan.org/tx/${receipt.receipts[0].transactionHash}` : '',
          status: 'success'
        };
      }
      
      return {
        message: "Swap is still processing",
        userOpHash,
        txLink: '',
        status: 'pending'
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      
      return {
        message: "Unable to fetch swap details. Please try again later.",
        txLink: '',
        userOpHash,
        status: 'error'
      };
    }
  }
}

async function handleFetchReceipt(userOpHash: string, options: { timeout?: number; interval?: number } = {}) {
  const { timeout = 30000, interval = 3000 } = options;
  const endTime = Date.now() + timeout;

  while (Date.now() < endTime) {
    const response = await getCallsStatus(userOpHash);

    if (response.status === "CONFIRMED") {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new AppError(
    ErrorCodes.TIMEOUT_ERROR,
    'Timeout: Transaction is still processing'
  );
}