import { blockchainApiRpc } from '@/data/EIP155Data';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
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
  simulateEvmTransaction: async (
    chainId: string,
    fromWalletAddress: string,
    calls: { to: string; value: string; data?: string }[]
  ) => {
    if (!calls || calls.length === 0) {
      console.warn('No transaction calls provided for simulation')
      return false
    }

    try {
      const client = createPublicClient({
        transport: http(blockchainApiRpc(Number(chainId))),
      })

      // Process all calls in parallel with individual error handling
      const results = await Promise.all(
        calls.map(async (call, index) => {
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
            console.warn(
              `Transaction #${index + 1} simulation failed for address ${call.to}: ${
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
      console.error(
        `Overall transaction simulation process failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
      return false
    }
  },

   /**
   * Simulates a Solana transaction
   * 
   * @param connection - Solana connection
   * @param transaction - Transaction to simulate
   * @param feePayer - Fee payer's public key
   * @returns Object with simulation success status and error details if applicable
   * @throws CheckoutError if there's a critical simulation error that should block the transaction
   */
   async simulateSolanaTransaction(param:{
    connection: Connection,
    transaction: Transaction,
    feePayer: PublicKey}
  ): Promise<boolean> {
    try {
      const {connection, transaction, feePayer} = param
      // Set recent blockhash for the transaction
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = feePayer

      // Simulate the transaction
      const simulation = await connection.simulateTransaction(transaction)

      // Check simulation results
      if (simulation.value.err) {
        console.warn('Solana simulation error:', simulation.value.err)
        return false
      }

      return true
    } catch (error) {
      return false
    }
  },
}

export default TransactionSimulatorUtil
