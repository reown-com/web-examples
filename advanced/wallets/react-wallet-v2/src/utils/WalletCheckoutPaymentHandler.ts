import { encodeFunctionData } from 'viem'
import { erc20Abi } from 'viem'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'

import {
  DetailedPaymentOption,
  CheckoutErrorCode,
  CheckoutError,
  SolanaContractInteraction
} from '@/types/wallet_checkout'
import { SOLANA_MAINNET_CHAINS } from '@/data/SolanaData'
import { SOLANA_TEST_CHAINS } from '@/data/SolanaData'

export interface PaymentResult {
  txHash: string
}

const WalletCheckoutPaymentHandler = {
  /**
   * Validates if a checkout request has expired
   */
  validateCheckoutExpiry(checkoutRequest: any): void {
    if (checkoutRequest.expiry) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (currentTime > checkoutRequest.expiry) {
        throw new CheckoutError(CheckoutErrorCode.CHECKOUT_EXPIRED, 'Checkout request has expired')
      }
    }
  },

  /**
   * Process a Solana contract interaction
   */
  async processSolanaContractInteraction(
    wallet: any,
    contractInteraction: SolanaContractInteraction,
    chainId: string
  ): Promise<PaymentResult> {
    const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error(`There is no RPC URL for the provided chain ${chainId}`)
    }
    const connection = new Connection(rpc)

    // Create a new transaction
    const transaction = new Transaction()

    const instruction = contractInteraction.data
    const accountMetas = instruction.accounts.map(acc => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable
    }))

    // Create the instruction
    const txInstruction = new TransactionInstruction({
      programId: new PublicKey(instruction.programId),
      keys: accountMetas,
      data: Buffer.from(instruction.data, 'base64')
    })

    // Add to transaction
    transaction.add(txInstruction)

    // Set the wallet's public key as feePayer
    const walletAddress = await wallet.getAddress()
    const publicKey = new PublicKey(walletAddress)
    transaction.feePayer = publicKey

    // Get recent blockhash from the connection
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash

    const txHash = await connection.sendRawTransaction(transaction.serialize())
    await connection.confirmTransaction(txHash, 'confirmed')

    return { txHash }
  },
  /**
   * Process any payment type and handle errors
   */
  async processPayment(wallet: any, payment: DetailedPaymentOption): Promise<PaymentResult> {
    try {
      const { contractInteraction, recipient, asset, chainMetadata } = payment
      const { chainNamespace, chainId } = chainMetadata

      // ------ Process Solana payments ------
      if (chainNamespace === 'solana') {
        // Check if wallet supports Solana operations
        if (!wallet.getAddress || !wallet.signAndSendTransaction) {
          throw new CheckoutError(
            CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
            'Solana payment requires a compatible wallet'
          )
        }
        // Contract interaction payment
        if (
          contractInteraction &&
          !recipient &&
          contractInteraction.type === 'solana-instruction'
        ) {
          return await this.processSolanaContractInteraction(
            wallet,
            contractInteraction as SolanaContractInteraction,
            `${chainNamespace}:${chainId}`
          )
        }
        // Direct payment (with recipient)
        if (recipient && !contractInteraction) {
          const recipientAddress = recipient.split(':')[2]
          const assetParts = asset.split('/')
          const assetNamespace = assetParts[1]?.split(':')[0]
          const assetReference = assetParts[1]?.split(':')[1]

          // Handle SOL transfers (slip44:501)
          if (assetNamespace === 'slip44' && assetReference === '501') {
            const txHash = await wallet.sendSol(
              recipientAddress,
              `${chainNamespace}:${chainId}`,
              BigInt(payment.amount)
            )
            return { txHash }
          }

          // Handle SPL token transfers (token:<mint-address>)
          if (assetNamespace === 'token') {
            const txHash = await wallet.sendSplToken(
              assetReference,
              recipientAddress,
              `${chainNamespace}:${chainId}`,
              BigInt(payment.amount)
            )
            return { txHash }
          }
        }
      }

      // Ensure wallet is an EVM wallet
      if (!wallet.sendTransaction) {
        throw new CheckoutError(
          CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
          'EVM payment requires an EVM wallet'
        )
      }
      // Direct payment (with recipient)
      if (recipient && !contractInteraction) {
        const { asset, amount, assetMetadata } = payment
        const { assetNamespace } = assetMetadata
        const assetAddress = asset.split(':')[2]
        const recipientAddress = recipient.split(':')[2] as `0x${string}`

        // Handle ETH transfers
        if (assetNamespace === 'slip44' && assetAddress === '60') {
          const tx = await wallet.sendTransaction({
            to: recipientAddress,
            value: BigInt(amount)
          })
          return { txHash: tx.hash }
        }

        // Handle ERC20 transfers
        if (assetNamespace === 'erc20') {
          const calldata = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress, BigInt(amount)]
          })
          const tx = await wallet.sendTransaction({
            to: assetAddress,
            value: '0x0',
            data: calldata
          })
          return { txHash: tx.hash }
        }
      }
      // Contract interaction payment
      if (
        contractInteraction &&
        !recipient &&
        Array.isArray(contractInteraction.data) &&
        contractInteraction.type === 'evm-calls'
      ) {
        let lastTxHash = '0x'

        for (const call of contractInteraction.data) {
          console.log('Processing contract call:', call)
          const tx = await wallet.sendTransaction({
            to: call.to,
            value: call.value,
            data: call.data
          })
          console.log('Transaction sent:', tx)
          lastTxHash = tx.hash
        }

        return { txHash: lastTxHash }
      }

      // Neither or both are present
      throw new CheckoutError(CheckoutErrorCode.INVALID_CHECKOUT_REQUEST)
    } catch (error) {
      console.error('Payment processing error:', error)

      // If it's already a CheckoutError, pass it through
      if (error instanceof CheckoutError) {
        throw error
      }

      // Otherwise create an appropriate error based on payment type
      const { contractInteraction } = payment
      const errorCode = contractInteraction
        ? CheckoutErrorCode.CONTRACT_INTERACTION_FAILED
        : CheckoutErrorCode.DIRECT_PAYMENT_ERROR

      throw new CheckoutError(errorCode)
    }
  }
}

export default WalletCheckoutPaymentHandler
