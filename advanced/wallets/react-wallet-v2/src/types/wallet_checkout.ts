/**
 * Hexadecimal string representation with '0x' prefix
 */
export type Hex = `0x${string}`

/**
 * Metadata for a product included in the checkout
 * @property name - The name of the product
 * @property description - Optional description of the product
 * @property imageUrl - Optional URL to an image of the product
 * @property price - Optional price of the product in a human-readable format (e.g. "$100.00")
 */
export type ProductMetadata = {
  /** The name of the product */
  name: string
  /** Optional description of the product */
  description?: string
  /** Optional URL to an image of the product */
  imageUrl?: string
  /** Optional price of the product in a human-readable format (e.g. "$100.00") */
  price?: string
}

/**
 * Smart contract interaction details
 * @property type - The type of contract interaction (e.g. "evm-calls", "solana-instruction")
 * @property data - Data required for the specific contract interaction type
 */
export type ContractInteraction = {
  /** The type of contract interaction (e.g. "evm-calls", "solana-instruction") */
  type: string
  /** Data required for the specific contract interaction type */
  data: any
}

/**
 * EVM-specific contract interaction
 * @property type - Must be "evm-calls"
 * @property data - Array of contract call data objects
 */
export type EvmContractInteraction = {
  /** Must be "evm-calls" */
  type: 'evm-calls'
  /** Array of contract call data objects */
  data: {
    /** Contract address */
    to: string
    /** Optional additional ETH value */
    value?: Hex
    /** Contract call data */
    data: Hex
  }[]
}

/**
 * A payment option for the checkout
 * @property asset - CAIP-19 asset identifier
 * @property amount - Hex-encoded amount of the asset to transfer
 * @property recipient - Optional CAIP-10 account ID of the recipient (required for direct payments)
 * @property contractInteraction - Optional contract interaction details (required for contract-based payments)
 */
export type PaymentOption = {
  /** CAIP-19 asset identifier */
  asset: string
  /** Hex-encoded amount of the asset to transfer */
  amount: Hex
  /** CAIP-10 account ID of the recipient (required for direct payments) */
  recipient?: string
  /** Contract interaction details (required for contract-based payments) */
  contractInteraction?: ContractInteraction
}

/**
 * Checkout request parameters
 * @property orderId - Unique identifier for this checkout request (max 128 chars)
 * @property acceptedPayments - Array of accepted payment options
 * @property products - Optional array of product metadata
 * @property expiry - Optional UNIX timestamp (seconds) after which the payment request expires
 */
export type CheckoutRequest = {
  /** Unique identifier for this checkout request (max 128 chars) */
  orderId: string
  /** Array of accepted payment options */
  acceptedPayments: PaymentOption[]
  /** Optional array of product metadata */
  products?: ProductMetadata[]
  /** Optional UNIX timestamp (seconds) after which the payment request expires */
  expiry?: number
}

/**
 * Checkout result returned by the wallet
 * @property orderId - Matching order ID from the original request
 * @property txid - Transaction identifier on the blockchain
 * @property recipient - Optional CAIP-10 account ID that received the payment
 * @property asset - Optional CAIP-19 asset identifier that was used for payment
 * @property amount - Optional hex-encoded amount that was paid
 */
export type CheckoutResult = {
  /** Matching order ID from the original request */
  orderId: string
  /** Transaction identifier on the blockchain */
  txid: string
  /** CAIP-10 account ID that received the payment */
  recipient?: string
  /** CAIP-19 asset identifier that was used for payment */
  asset?: string
  /** Hex-encoded amount that was paid */
  amount?: Hex
}

/**
 * Error codes for wallet_checkout method
 */
export enum CheckoutErrorCode {
  /** User rejected the payment */
  USER_REJECTED = 4001,
  /** No matching assets available in user's wallet */
  NO_MATCHING_ASSETS = 4100,
  /** Checkout has expired */
  CHECKOUT_EXPIRED = 4200,
  /** Insufficient funds for the payment */
  INSUFFICIENT_FUNDS = 4300,
  /** Unsupported contract interaction type */
  UNSUPPORTED_CONTRACT_INTERACTION = 4400,
  /** Invalid contract interaction data */
  INVALID_CONTRACT_INTERACTION_DATA = 4401,
  /** Contract interaction failed during execution */
  CONTRACT_INTERACTION_FAILED = 4402,
  /** Method not found (wallet doesn't support wallet_checkout) */
  METHOD_NOT_FOUND = -32601,
  /** Invalid checkout request */
  INVALID_CHECKOUT_REQUEST = 4500,
  /** Direct payment failed */
  DIRECT_PAYMENT_ERROR = 4600
}

/**
 * Standard error messages for checkout error codes
 */
export const CheckoutErrorMessages: Record<CheckoutErrorCode, string> = {
  [CheckoutErrorCode.USER_REJECTED]: 'User rejected payment',
  [CheckoutErrorCode.NO_MATCHING_ASSETS]: 'No matching assets available',
  [CheckoutErrorCode.CHECKOUT_EXPIRED]: 'Checkout expired',
  [CheckoutErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds',
  [CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION]: 'Unsupported contract interaction',
  [CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA]: 'Invalid contract interaction data',
  [CheckoutErrorCode.CONTRACT_INTERACTION_FAILED]: 'Contract interaction failed',
  [CheckoutErrorCode.METHOD_NOT_FOUND]: 'Method not found',
  [CheckoutErrorCode.INVALID_CHECKOUT_REQUEST]: 'Invalid checkout request',
  [CheckoutErrorCode.DIRECT_PAYMENT_ERROR]: 'Direct payment failed'
}

/**
 * Checkout error class
 * @extends Error
 */
export class CheckoutError extends Error {
  /** Error code indicating the type of error */
  code: CheckoutErrorCode
  /** Description of the error */
  message: string
  /** Optional additional data about the error */
  data?: any

  constructor(code: CheckoutErrorCode, message?: string, data?: any) {
    super(message)
    this.code = code
    this.data = data
    this.message = message || getErrorMessage(code)
  }
}

export type CheckoutErrorResponse = {
  code: number
  message: string
}

/**
 * Get a standard error message for a checkout error code
 * @param code - The error code
 * @returns The standard error message for the code
 */
export function getErrorMessage(code: CheckoutErrorCode): string {
  return CheckoutErrorMessages[code] || 'Unknown error'
}

/**
 * Create a checkout error with the standard message for the error code
 * @param code - The error code
 * @param customMessage - Optional custom message to override the standard one
 * @param data - Optional additional error data
 * @returns A checkout error object
 */
export function createCheckoutError(
  code: CheckoutErrorCode,
  customMessage?: string,
  data?: any
): CheckoutError {
  return new CheckoutError(code, customMessage, data)
}

export type DetailedPaymentOption = PaymentOption & {
  assetMetadata: {
    assetIcon: string
    assetName: string
    assetSymbol: string
    assetNamespace: string
    assetDecimals: number
  }
  chainMetadata: {
    chainId: string
    chainName: string
    chainNamespace: string
    chainIcon: string
  }
}
