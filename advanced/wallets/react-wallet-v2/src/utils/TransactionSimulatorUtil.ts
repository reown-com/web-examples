import { blockchainApiRpc } from '@/data/EIP155Data'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
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
      console.warn('No transaction calls provided for simulation.')
      return null
    }

    const client = createPublicClient({
      transport: http(blockchainApiRpc(Number(chainId)))
    })
    let totalGasFee: bigint = BigInt(0)
    // Process all calls in parallel with individual error handling
    for (const [index, call] of calls.entries()) {
      try {
        // Estimate gas required for the transaction
        const gasEstimate = await client.estimateGas({
          account: fromWalletAddress as `0x${string}`,
          to: call.to as `0x${string}`,
          value: BigInt(call.value || '0x0'),
          data: (call.data || '0x') as `0x${string}`
        })

        // Retrieve current gas price
        const gasPrice = await client.getGasPrice()

        // Calculate gas fee for this transaction
        const gasFee = gasEstimate * gasPrice
        totalGasFee += gasFee
      } catch (error) {
        console.warn(
          `Simulation failed for transaction #${index + 1} to ${call.to}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
        return null
      }
    }
    // Convert totalGasFee from bigint to number
    const totalGasFeeNumber = Number(totalGasFee)

    // Check for potential precision loss during conversion
    if (!Number.isSafeInteger(totalGasFeeNumber)) {
      console.warn('Total gas fee exceeds safe integer limit and may be imprecise.')
      return null
    }
    return totalGasFeeNumber
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
  async simulateSolanaTransaction(param: {
    connection: Connection
    transaction: Transaction
    feePayer: PublicKey
  }): Promise<number | null> {
    try {
      const { connection, transaction, feePayer } = param

      // Set the fee payer and recent blockhash
      transaction.feePayer = feePayer
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Convert the transaction to a VersionedTransaction
      const versionedTransaction = new VersionedTransaction(transaction.compileMessage())

      // Get the fee for the transaction message
      const feeResponse = await connection.getFeeForMessage(versionedTransaction.message)
      const fee = feeResponse.value

      if (fee === null) {
        console.warn('Failed to fetch transaction fee.')
        return null
      }

      console.log('Estimated transaction fee:', fee)

      // Simulate the transaction
      const simulation = await connection.simulateTransaction(transaction)
      if (simulation.value.err) {
        console.warn('Solana simulation error:', simulation.value.err)
        return null
      }

      return fee
    } catch (error) {
      console.error('Error during transaction simulation:', error)
      return null
    }
  }
}

export default TransactionSimulatorUtil
