import { z } from 'zod'
import {
  type PaymentOption,
  type DetailedPaymentOption,
  type CheckoutRequest,
  CheckoutErrorCode,
  createCheckoutError,
  CheckoutError
} from '@/types/wallet_checkout'
import { CheckoutRequestSchema } from '@/schema/WalletCheckoutSchema'
import { PaymentValidationUtils } from './PaymentValidatorUtil'

const WalletCheckoutUtil = {
  /**
   * Format the recipient address for display
   * Shortens the address with ellipsis for better display
   *
   * @param recipient - CAIP-10 account ID
   * @returns The formatted recipient address
   */
  formatRecipient(recipient: string): string {
    try {
      const parts = recipient.split(':')
      if (parts.length !== 3) return recipient

      const address = parts[2]
      if (address.length < 10) return address

      return `${address.substring(0, 10)}...${address.substring(address.length - 4)}`
    } catch (e) {
      return recipient
    }
  },

  /**
   * Validates a checkout request structure and payment options using Zod schemas
   * Throws an error if the request is invalid
   *
   * @param checkoutRequest - The checkout request to validate
   * @throws CheckoutError if validation fails
   */
  validateCheckoutRequest(checkoutRequest: CheckoutRequest): void {
    try {
      // Check for request expiry
      if (checkoutRequest.expiry) {
        const currentTime = Math.floor(Date.now() / 1000) // Current time in seconds
        if (currentTime > checkoutRequest.expiry) {
          throw createCheckoutError(CheckoutErrorCode.CHECKOUT_EXPIRED)
        }
      }

      // Use Zod to validate the checkout request structure
      CheckoutRequestSchema.parse(checkoutRequest)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        throw createCheckoutError(
          CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
          `Validation failed: ${errorDetails}`
        )
      }
      throw error
    }
  },

  /**
   * Prepares a checkout request by validating it and checking if the user has sufficient balances
   * for at least one payment option.
   *
   * @param checkoutRequest - The checkout request to prepare
   * @returns A promise that resolves to an object with feasible payments
   * @throws CheckoutError if validation or preparation fails
   */
  async getFeasiblePayments(checkoutRequest: CheckoutRequest): Promise<{
    feasiblePayments: DetailedPaymentOption[]
  }> {
    this.validateCheckoutRequest(checkoutRequest)
    const { acceptedPayments } = checkoutRequest

    // find feasible direct payments
    const { feasiblePayments, isUserHaveAtleastOneMatchingAssets } =
      await PaymentValidationUtils.findFeasiblePayments(acceptedPayments)

    // This return error if user have no matching assets
    if (!isUserHaveAtleastOneMatchingAssets && !feasiblePayments) {
      throw createCheckoutError(CheckoutErrorCode.NO_MATCHING_ASSETS)
    }

    // This return error if user have atleast one matching assets but no feasible payments
    if (feasiblePayments.length === 0) {
      throw createCheckoutError(CheckoutErrorCode.INSUFFICIENT_FUNDS)
    }

    return { feasiblePayments }
  },

  // Add these methods directly to the object
  formatCheckoutSuccessResponse<T>(id: number | string, result: T) {
    return {
      jsonrpc: '2.0',
      id: typeof id === 'string' ? parseInt(id) : id,
      result
    }
  },

  formatCheckoutErrorResponse(id: number | string, error: Error | CheckoutError | unknown) {
    // Default error code for unknown errors
    let code = CheckoutErrorCode.INVALID_CHECKOUT_REQUEST
    let message = 'Unknown error'
    let data = undefined

    // Handle different error types
    if (error instanceof CheckoutError) {
      code = error.code
      message = error.message
      data = error.data
    } else if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    }

    return {
      jsonrpc: '2.0',
      id: typeof id === 'string' ? parseInt(id) : id,
      error: {
        code,
        message,
        data
      }
    }
  }
}

export default WalletCheckoutUtil
