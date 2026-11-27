import { BigNumber, providers } from 'ethers'

/** 0.001 gwei: keeps a quiet L2 from producing a zero tip that never gets picked up */
const PRIORITY_FEE_FLOOR = BigNumber.from('1000000')

/**
 * Fills in EIP-1559 fees from the node when the request carries none.
 *
 * ethers v5's `getFeeData()` assumes a 1.5 gwei priority fee, hundreds of times the going
 * rate on L2s such as Base. A node checks that the account can cover gasLimit × maxFeePerGas
 * before it estimates, so that inflated cap makes `estimateGas` fail with "execution reverted"
 * on accounts holding only a little ETH, even though the transaction itself is fine. Asking the
 * node for `eth_maxPriorityFeePerGas` instead sizes the cap to the real market.
 */
export async function withNodeFees<T extends providers.TransactionRequest>(
  provider: providers.JsonRpcProvider,
  transaction: T
): Promise<T> {
  if (transaction.gasPrice || transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) {
    return transaction
  }
  const block = await provider.getBlock('latest')
  if (!block?.baseFeePerGas) return transaction // pre-1559 chain: ethers falls back to gasPrice

  let priority: BigNumber
  try {
    priority = BigNumber.from(await provider.send('eth_maxPriorityFeePerGas', []))
  } catch {
    return transaction // node does not offer it: keep ethers' defaults
  }
  if (priority.lt(PRIORITY_FEE_FLOOR)) priority = PRIORITY_FEE_FLOOR

  return {
    ...transaction,
    type: 2,
    maxPriorityFeePerGas: priority,
    maxFeePerGas: block.baseFeePerGas.mul(2).add(priority)
  }
}

/**
 * A short, dapp-facing message for an ethers send failure, instead of the full error dump
 * (which embeds the whole JSON-RPC exchange).
 */
export function describeSendError(error: unknown): string {
  const err = error as {
    code?: string
    reason?: string
    message?: string
    error?: { reason?: string; message?: string }
  }
  const inner = err?.error?.reason ?? err?.error?.message
  switch (err?.code) {
    case 'INSUFFICIENT_FUNDS':
      return 'Insufficient ETH to cover gas for this transaction'
    case 'UNPREDICTABLE_GAS_LIMIT':
      return `Gas estimation failed${
        inner ? ` (${inner})` : ''
      }: the transaction would revert, or the account cannot cover gas × max fee`
    case 'NONCE_EXPIRED':
    case 'REPLACEMENT_UNDERPRICED':
    case 'TRANSACTION_REPLACED':
      return `${err.code}: ${inner ?? err.reason ?? 'transaction could not be sent'}`
    default: {
      const message = err?.reason ?? err?.message ?? String(error)
      return message.split(' [ See:')[0].split(' (error=')[0].slice(0, 300)
    }
  }
}
