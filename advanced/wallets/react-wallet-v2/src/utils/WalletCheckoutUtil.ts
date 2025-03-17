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
   * Format the asset ID for display
   * Extracts the asset reference from a CAIP-19 asset ID
   *
   * @param assetId - CAIP-19 asset ID
   * @returns The formatted asset display name
   */
  formatAsset(assetId: string): string {
    try {
      const parts = assetId.split('/')
      if (parts.length !== 2) return assetId

      const assetParts = parts[1].split(':')
      if (assetParts.length !== 2) return parts[1]

      // For ERC20 tokens, return the token address
      // In a production app, you might want to map this to token symbols
      return assetParts[1]
    } catch (e) {
      return assetId
    }
  },

  /**
   * Format the hex amount to a decimal value
   *
   * @param hexAmount - Hex-encoded amount string
   * @param decimals - Number of decimals for the asset (default: 6)
   * @returns The formatted amount as a string
   */
  formatAmount(hexAmount: string, decimals = 6): string {
    try {
      if (!hexAmount.startsWith('0x')) return hexAmount

      const amount = parseInt(hexAmount, 16) / Math.pow(10, decimals)
      return amount.toFixed(2)
    } catch (e) {
      return hexAmount
    }
  },

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

      // Additional validation for CAIP formats that Zod can't easily handle
      const { acceptedPayments } = checkoutRequest

      for (const payment of acceptedPayments) {
        // For contract payments, additional validation
        if (payment.contractInteraction) {
          // check if contract interaction type is supported
          if (payment.contractInteraction.type !== 'evm-calls') {
            throw createCheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
          }

          // check if contract interaction data is valid
          if (
            !payment.contractInteraction.data ||
            !Array.isArray(payment.contractInteraction.data)
          ) {
            throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
          }
        }
      }
    } catch (error) {
      // Convert Zod validation errors or custom errors to CheckoutError
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
   * Separates the accepted payments into direct payments and contract payments
   * following the CAIP standard requirements
   *
   * @param acceptedPayments - Array of payment options
   * @returns An object containing arrays of direct payments and contract payments
   */
  separatePayments(acceptedPayments: PaymentOption[]) {
    const directPayments: PaymentOption[] = []
    const contractPayments: PaymentOption[] = []

    acceptedPayments.forEach(payment => {
      // Skip if payment is undefined or null
      if (!payment) {
        return
      }

      const { recipient, contractInteraction } = payment
      const hasRecipient = typeof recipient === 'string' && recipient.trim() !== ''
      const hasContractInteraction = contractInteraction !== undefined

      // Direct payment: recipient is present and contractInteraction is absent
      if (hasRecipient && !hasContractInteraction) {
        directPayments.push(payment)
      }
      // Contract interaction: contractInteraction is present and recipient is absent
      else if (hasContractInteraction && !hasRecipient) {
        contractPayments.push(payment)
      }
    })

    return {
      directPayments,
      contractPayments
    }
  },
  /**
   * Prepares a checkout request by validating it and checking if the user has sufficient balances
   * for at least one payment option.
   *
   * @param account - User's account address
   * @param checkoutRequest - The checkout request to prepare
   * @returns A promise that resolves to an object with feasible payments
   * @throws CheckoutError if validation or preparation fails
   */
  async getFeasiblePayments(checkoutRequest: CheckoutRequest): Promise<{
    feasiblePayments: DetailedPaymentOption[]
  }> {
    // Validate the checkout request (will throw if invalid)
    this.validateCheckoutRequest(checkoutRequest)
    try {
      const { acceptedPayments } = checkoutRequest

      // Separate payments for processing
      const { directPayments, contractPayments } = this.separatePayments(acceptedPayments)

      // find feasible direct payments
      const { feasibleDirectPayments, isUserHaveAtleastOneMatchingAssets } =
        await PaymentValidationUtils.findFeasibleDirectPayments(directPayments)
      // find feasible contract payments
      const {
        feasibleContractPayments,
        isUserHaveAtleastOneMatchingAssets: validContractPayments
      } = await PaymentValidationUtils.findFeasibleContractPayments(contractPayments)
      // This return error if user have no matching assets
      if (!isUserHaveAtleastOneMatchingAssets && !validContractPayments) {
        throw createCheckoutError(CheckoutErrorCode.NO_MATCHING_ASSETS)
      }

      // Combine all feasible payments
      const feasiblePayments: DetailedPaymentOption[] = [
        ...feasibleDirectPayments,
        ...feasibleContractPayments
      ]

      // This return error if user have atleast one matching assets but no feasible payments
      if (feasiblePayments.length === 0) {
        throw createCheckoutError(CheckoutErrorCode.INSUFFICIENT_FUNDS)
      }

      return { feasiblePayments }
    } catch (error) {
      // If it's already a CheckoutError, rethrow it
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }

      // Otherwise wrap it in a CheckoutError
      throw createCheckoutError(
        CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
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
