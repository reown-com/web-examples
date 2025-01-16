import { parseEther } from 'viem';
import { executeActionsWithECDSAKey } from '@/utils/ERC7715PermissionsAsyncUtils';
import { SmartSessionGrantPermissionsResponse } from '@reown/appkit-experimental/smart-session';
import { SWAP_CONFIG } from '@/config/constants';
import { ChainUtil } from '@/utils/ChainUtil';
import { SwapResponse } from '@/types/api';
import { OneInchApiService } from './1inch';
import type { SwapParams } from '@/types/1inch';
import { ApiError, SwapError } from '@/errors/api-errors';

export class SwapService {
  private static async prepareSwapTransaction(swapParams: SwapParams) {
    const oneInchApi = OneInchApiService.getInstance();
    
    try {
      // Uncomment to add allowance checking if needed
      // const allowance = await oneInchApi.checkAllowance(swapParams.src, swapParams.from);
      // if (BigInt(allowance) < BigInt(swapParams.amount)) {
      //   await oneInchApi.buildApprovalTransaction(swapParams.src);
      // }

      return await oneInchApi.buildSwapTransaction(swapParams);
    } catch (error) {
      if (error instanceof SwapError || error instanceof ApiError) {
        throw error;
      }
      throw new SwapError('Unexpected error occurred during swap preparation', error);
    }
  }

  static async executeSwap(
    permissions: SmartSessionGrantPermissionsResponse
  ): Promise<SwapResponse> {
    const amount = parseEther(SWAP_CONFIG.AMOUNT_ETH);
    
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
      throw new Error('APPLICATION_PRIVATE_KEY is not set');
    }

    const swapTransaction = await this.prepareSwapTransaction(swapParams);
    const calls = [{
      to: swapTransaction.tx.to,
      data: swapTransaction.tx.data,
      value: BigInt(swapTransaction.tx.value),
    }];

    const userOpHash = await executeActionsWithECDSAKey({
      actions: calls,
      ecdsaPrivateKey: privateKey,
      chain,
      accountAddress: swapParams.from,
      permissionsContext: permissions.context
    });

    return {
      message: `Successfully swapped ${SWAP_CONFIG.AMOUNT_ETH} ETH to USDC`,
      status: 'success',
      userOpHash
    };
  }
}