import { createPublicClient, http } from 'viem'

const TransactionSimulatorUtil = {
  /**
   * Checks if a transaction would be valid by attempting to estimate gas
   * Returns true if estimation succeeds, false if it would fail
   *
   * @param chainId - The blockchain chain ID
   * @param fromWalletAddress - The sender's wallet address
   * @param calls - Array of transaction details to simulate
   * @returns Boolean indicating if all transactions would be valid
   */
  canTransactionSucceed: async (
    chainId: string,
    fromWalletAddress: string,
    calls: { to: string; value: string; data?: string }[]
  ) => {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

    const client = createPublicClient({
      transport: http(
        `https://rpc.walletconnect.org/v1?chainId=eip155:${chainId}&projectId=${projectId}`
      )
    })

    try {
      // Process all calls in parallel
      const results = await Promise.all(
        calls.map(async call => {
          try {
            // Get current fee estimates
            const { maxFeePerGas, maxPriorityFeePerGas } = await client.estimateFeesPerGas()

            // Try to estimate gas - if this succeeds, the transaction would execute
            await client.estimateGas({
              type: 'eip1559',
              maxFeePerGas,
              maxPriorityFeePerGas,
              account: fromWalletAddress as `0x${string}`,
              to: call.to as `0x${string}`,
              value: BigInt(call.value || '0x0'),
              data: (call.data || '0x') as `0x${string}`
            })

            // If we get here, estimation succeeded
            return true
          } catch (error) {
            // Gas estimation failed - transaction would not succeed
            console.error(
              `Transaction simulation failed: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            )
            return false
          }
        })
      )

      // Return true only if all transactions would succeed
      return results.every(success => success)
    } catch (error) {
      // Handle any unexpected errors
      console.error(
        `Error in transaction simulation: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
      return false
    }
  }
}

export default TransactionSimulatorUtil
