import { encodeFunctionData } from 'viem'
import { erc721Abi, erc20Abi } from 'viem'

import {
  PaymentOption,
  DetailedPaymentOption,
  CheckoutResult,
  CheckoutErrorMessages,
  CheckoutErrorCode,
  CheckoutError
} from '@/types/wallet_checkout'
import { Wallet } from 'ethers'
import { walletkit } from './WalletConnectUtil'
import { formatJsonRpcError } from '@json-rpc-tools/utils'

export interface PaymentResult {
  success: boolean
  txHash: string
  error?: CheckoutError
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
   * Process any payment with error handling
   */
  async processPayment(wallet: Wallet, payment: DetailedPaymentOption): Promise<PaymentResult> {
    try {
      const txHash = await this.handlePayment(wallet, payment)
      return { success: true, txHash }
    } catch (error) {
      console.error('Payment processing error:', error)

      // If it's already a CheckoutError, pass it through
      if (error instanceof CheckoutError) {
        return {
          success: false,
          txHash: '0x',
          error
        }
      }

      // Otherwise create an appropriate error based on payment type
      const { contractInteraction } = payment
      const errorCode = contractInteraction
        ? CheckoutErrorCode.CONTRACT_INTERACTION_FAILED
        : CheckoutErrorCode.DIRECT_PAYMENT_ERROR

      return {
        success: false,
        txHash: '0x',
        error: new CheckoutError(
          errorCode,
          error instanceof Error ? error.message : 'Unknown payment error'
        )
      }
    }
  },

  /**
   * Core implementation to handle any payment type
   */
  async handlePayment(wallet: Wallet, payment: DetailedPaymentOption): Promise<string> {
    const { contractInteraction, recipient } = payment

    // Validate the payment configuration
    if (recipient && !contractInteraction) {
      // Handle direct payment
      const { asset, amount, assetMetadata } = payment
      const { assetNamespace } = assetMetadata
      const assetAddress = asset.split(':')[2]
      const recipientAddress = recipient.split(':')[2] as `0x${string}`
      const accountAddress = wallet.address as `0x${string}`

      // Handle ETH transfers
      if (assetNamespace === 'slip44' && assetAddress === '60') {
        const tx = await wallet.sendTransaction({
          to: recipientAddress,
          value: BigInt(amount)
        })
        return tx.hash
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
        return tx.hash
      }

      throw new CheckoutError(
        CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
        `Unsupported asset type: ${assetNamespace}`
      )
    } else if (contractInteraction && !recipient) {
      // Handle contract payment
      // Handle array of calls
      if (Array.isArray(contractInteraction.data) && contractInteraction.type === 'evm-calls') {
        let lastTxHash = '0x'

        for (const call of contractInteraction.data) {
          console.log('call', call)
          const tx = await wallet.sendTransaction({
            to: call.to,
            value: call.value,
            data: call.data
          })
          console.log('tx', tx)
          lastTxHash = tx.hash
        }

        return lastTxHash
      }

      throw new CheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
    }
    // Neither or both are present - already validated above but TypeScript needs this
    throw new CheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      'Payment must have either recipient or contractInteraction, not both or neither'
    )
  }
}

export default WalletCheckoutPaymentHandler
