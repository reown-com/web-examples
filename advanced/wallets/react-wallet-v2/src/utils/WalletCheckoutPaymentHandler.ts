import { encodeFunctionData } from 'viem'
import { erc20Abi } from 'viem'

import { DetailedPaymentOption, CheckoutErrorCode, CheckoutError } from '@/types/wallet_checkout'
import { Wallet } from 'ethers'

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
   * Process any payment type and handle errors
   */
  async processPayment(wallet: Wallet, payment: DetailedPaymentOption): Promise<PaymentResult> {
    try {
      const { contractInteraction, recipient } = payment

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

        throw new CheckoutError(CheckoutErrorCode.INVALID_CHECKOUT_REQUEST)
      }
      // Contract interaction payment
      else if (contractInteraction && !recipient) {
        // Handle array of calls
        if (Array.isArray(contractInteraction.data) && contractInteraction.type === 'evm-calls') {
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

        throw new CheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
      }

      // Neither or both are present
      throw new CheckoutError(
        CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
        'Payment must have either recipient or contractInteraction, not both or neither'
      )
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
