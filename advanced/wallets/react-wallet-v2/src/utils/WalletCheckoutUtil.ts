import { z } from 'zod'
import { getChainData } from '@/data/chainsUtil'
import {
  type PaymentOption,
  type ContractInteraction,
  type DetailedPaymentOption,
  type CheckoutRequest,
  CheckoutErrorCode,
  createCheckoutError,
  Hex,
  CheckoutError
} from '@/types/wallet_checkout'
import { createPublicClient, erc20Abi, hexToNumber, http, getContract, encodeFunctionData } from 'viem'
import TransactionSimulatorUtil from './TransactionSimulatorUtil'
import SettingsStore from '@/store/SettingsStore'
import { useState, useEffect } from 'react'
import { getTokenData } from '@/data/tokenUtil'
import { getChainById } from './ChainUtil'
import { EIP155_CHAINS } from '@/data/EIP155Data'

// Define Zod schemas for validation
const ProductMetadataSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.string().optional()
})

const ContractInteractionSchema = z.object({
  type: z.string().min(1, 'Contract interaction type is required'),
  data: z
    .union([
      z.record(z.any()), // Object with string keys
      z.array(z.any()) // Array of any values
    ])
    .refine(
      data => data !== null && (typeof data === 'object' || Array.isArray(data)),
      'Contract data must be an object or an array'
    )
})

const PaymentOptionSchema = z
  .object({
    asset: z.string().min(1, 'Asset is required'),
    amount: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Amount must be a hex string'),
    recipient: z.string().optional(),
    contractInteraction: ContractInteractionSchema.optional()
  })
  .refine(
    data =>
      (data.recipient && !data.contractInteraction) ||
      (!data.recipient && data.contractInteraction),
    'Either recipient or contractInteraction must be provided, but not both'
  )

const CheckoutRequestSchema = z.object({
  orderId: z.string().max(128, 'Order ID must not exceed 128 characters'),
  acceptedPayments: z.array(PaymentOptionSchema).min(1, 'At least one payment option is required'),
  products: z.array(ProductMetadataSchema).optional(),
  expiry: z.number().int().optional()
})

const WalletCheckoutUtil = {
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
    const invalidPayments: PaymentOption[] = []

    // Check if input is an array and not undefined or null
    if (!acceptedPayments || !Array.isArray(acceptedPayments)) {
      return { directPayments, contractPayments, invalidPayments }
    }

    acceptedPayments.forEach(payment => {
      // Skip if payment is undefined or null
      if (!payment) {
        return
      }

      // Check if payment has the required asset and amount fields
      if (!payment.asset || !payment.amount) {
        invalidPayments.push(payment)
        return
      }

      // Check for hex-encoded amount
      if (typeof payment.amount !== 'string' || !payment.amount.startsWith('0x')) {
        invalidPayments.push(payment)
        return
      }

      const hasRecipient = typeof payment.recipient === 'string' && payment.recipient.trim() !== ''
      const hasContractInteraction = this.isValidContractInteraction(payment.contractInteraction)

      // Direct payment: recipient is present and contractInteraction is absent
      if (hasRecipient && !hasContractInteraction) {
        // Validate CAIP-10 account ID format for recipient
        if (!this.isValidCAIP10(payment.recipient!)) {
          invalidPayments.push(payment)
          return
        }

        // Validate that asset is in CAIP-19 format
        if (!this.isValidCAIP19(payment.asset)) {
          invalidPayments.push(payment)
          return
        }

        // Validate matching chain IDs between asset and recipient
        if (!this.matchingChainIds(payment.asset, payment.recipient!)) {
          invalidPayments.push(payment)
          return
        }

        directPayments.push(payment)
      }
      // Contract interaction: contractInteraction is present and recipient is absent
      else if (hasContractInteraction && !hasRecipient) {
        contractPayments.push(payment)
      }
      // Invalid payment: both present or both absent
      else {
        invalidPayments.push(payment)
      }
    })

    return {
      directPayments,
      contractPayments,
      invalidPayments
    }
  },

  /**
   * Checks if a contract interaction is valid
   *
   * @param contractInteraction - Contract interaction to validate
   * @returns Whether the contract interaction is valid
   */
  isValidContractInteraction(contractInteraction: ContractInteraction | undefined): boolean {
    if (!contractInteraction) return false

    return (
      typeof contractInteraction === 'object' &&
      typeof contractInteraction.type === 'string' &&
      contractInteraction.type.trim() !== '' &&
      typeof contractInteraction.data === 'object' &&
      contractInteraction.data !== null
    )
  },

  /**
   * Validates if a string follows the CAIP-10 format
   * Simple validation: chainNamespace:chainId:address
   *
   * @param accountId - CAIP-10 account ID to validate
   * @returns Whether the account ID is valid
   */
  isValidCAIP10(accountId: string): boolean {
    if (typeof accountId !== 'string') return false

    // Basic check: should be in format namespace:chainId:address
    const parts = accountId.split(':')
    return (
      parts.length === 3 && parts[0]?.length > 0 && parts[1]?.length > 0 && parts[2]?.length > 0
    )
  },

  /**
   * Validates if a string follows the CAIP-19 format
   * Simple validation: chainNamespace:chainId/assetNamespace:assetReference
   *
   * @param assetId - CAIP-19 asset ID to validate
   * @returns Whether the asset ID is valid
   */
  isValidCAIP19(assetId: string): boolean {
    if (typeof assetId !== 'string') return false

    // Format: namespace:chainId/assetNamespace:assetReference
    const chainAssetParts = assetId.split('/')
    if (chainAssetParts.length !== 2) return false

    const chainParts = chainAssetParts[0]?.split(':')
    const assetParts = chainAssetParts[1]?.split(':')

    return (
      chainParts?.length === 2 &&
      chainParts[0]?.length > 0 &&
      chainParts[1]?.length > 0 &&
      assetParts?.length === 2 &&
      assetParts[0]?.length > 0 &&
      assetParts[1]?.length > 0
    )
  },

  /**
   * Checks if the chain IDs in the asset and recipient match
   *
   * @param assetId - CAIP-19 asset ID
   * @param accountId - CAIP-10 account ID
   * @returns Whether the chain IDs match
   */
  matchingChainIds(assetId: string, accountId: string): boolean {
    try {
      if (typeof assetId !== 'string' || typeof accountId !== 'string') {
        return false
      }

      // Extract chain namespace and ID from asset
      const assetChainPart = assetId.split('/')[0]
      if (!assetChainPart) return false

      // Extract chain namespace and ID from account
      const accountParts = accountId.split(':')
      if (accountParts.length < 2) return false

      const accountChainPart = `${accountParts[0]}:${accountParts[1]}`

      return assetChainPart === accountChainPart
    } catch (e) {
      return false
    }
  },

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
   * Parses and validates a CAIP-19 asset ID
   *
   * @param asset - CAIP-19 asset ID string
   * @returns Object containing parsed asset details
   * @throws Error if asset is not in CAIP-19 format
   */
  getAssetDetails(asset: string) {
    if (typeof asset !== 'string') throw new Error('Invalid asset value, must be a string')

    // Format: namespace:chainId/assetNamespace:assetReference
    const chainAssetParts = asset.split('/')
    if (chainAssetParts.length !== 2)
      throw new Error('Invalid asset value, must be in CAIP-19 format')

    const chainParts = chainAssetParts[0]?.split(':')
    const assetParts = chainAssetParts[1]?.split(':')

    if (chainParts.length !== 2) throw new Error('Invalid asset value, must be in CAIP-19 format')
    if (assetParts.length !== 2) throw new Error('Invalid asset value, must be in CAIP-19 format')
    const chainNamespace = chainParts[0]
    const chainId = chainParts[1]
    const assetNamespace = assetParts[0]
    const assetAddress = assetParts[1]

    return {
      chainNamespace,
      chainId,
      assetNamespace,
      assetAddress
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
        // For direct payments (with recipient), validate CAIP formats
        if (payment.recipient) {
          // Validate CAIP-10 account ID format for recipient
          if (!this.isValidCAIP10(payment.recipient)) {
            throw new Error(`Invalid CAIP-10 format for recipient: ${payment.recipient}`)
          }

          // Validate that asset is in CAIP-19 format
          if (!this.isValidCAIP19(payment.asset)) {
            throw new Error(`Invalid CAIP-19 format for asset: ${payment.asset}`)
          }

          // Validate matching chain IDs between asset and recipient
          if (!this.matchingChainIds(payment.asset, payment.recipient)) {
            throw new Error(
              `Chain ID mismatch between asset (${payment.asset}) and recipient (${payment.recipient})`
            )
          }
        }

        // For contract payments, additional validation
        if (payment.contractInteraction) {
         // check if contract interaction type is supported
         if(payment.contractInteraction.type !== 'evm-calls') {
          throw createCheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
         }

         // check if contract interaction data is valid
         if(!payment.contractInteraction.data || typeof payment.contractInteraction.data !== 'object' || !Array.isArray(payment.contractInteraction.data)) {
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
      } else if (error instanceof Error) {
        throw createCheckoutError(CheckoutErrorCode.INVALID_CHECKOUT_REQUEST, error.message)
      } else {
        throw createCheckoutError(CheckoutErrorCode.INVALID_CHECKOUT_REQUEST, String(error))
      }
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
  async prepareCheckoutRequest(
    account: string,
    checkoutRequest: CheckoutRequest
  ): Promise<{
    feasiblePayments: DetailedPaymentOption[]
  }> {
    // Validate the checkout request (will throw if invalid)
    this.validateCheckoutRequest(checkoutRequest)
    try {
      const { acceptedPayments } = checkoutRequest

      // Separate payments for processing
      const { directPayments, contractPayments } = this.separatePayments(acceptedPayments)

      // Process direct payments
      const { feasibleDirectPayments, isUserHaveAtleastOneMatchingAssets } =
        await this.processFeasibleDirectPayments(directPayments)
      // Process contract payments
      const {
        feasibleContractPayments,
        isUserHaveAtleastOneMatchingAssets: validContractPayments
      } = await this.processFeasibleContractPayments(contractPayments)

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
      console.error(`Error processing checkout request:`, error)
      throw createCheckoutError(
        CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },

  /**
   * Processes direct payments and returns those that the user has sufficient balance for
   *
   * @param directPayments - Array of direct payment options
   * @param balance - User's balance information
   * @returns Array of detailed payment options that are feasible
   */
  async processFeasibleDirectPayments(
    directPayments: PaymentOption[],
  ): Promise<{
    feasibleDirectPayments: DetailedPaymentOption[];
    isUserHaveAtleastOneMatchingAssets: boolean;
  }> {
    let isUserHaveAtleastOneMatchingAssets = false;
    const account = SettingsStore.state.eip155Address;
    // Use Promise.all to handle async operations in map
    const paymentPromises = directPayments.map(async payment => {
      try {
        const recipientAddress = payment.recipient?.split(':')[2]
        if(!recipientAddress) {
          return null
        }
        // Parse the asset details
        const { chainId, assetAddress, chainNamespace, assetNamespace } = this.getAssetDetails(
          payment.asset
        );
        let assetDetails = {balance: BigInt(0), decimals: 18, symbol: '', name: ''};
        // Handle ERC20 tokens
        if(assetNamespace === 'erc20') {
                     
          await TransactionSimulatorUtil.simulateAndCheckERC20Transfer(
            chainId,
            account as `0x${string}`,
            [{
              to: assetAddress as `0x${string}`,
              value: '0x0',
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: 'transfer',
                args: [recipientAddress as `0x${string}`, BigInt(payment.amount)]
              })
            }]
          )
           

          assetDetails = await getErc20TokenDetails(
            assetAddress as `0x${string}`, 
            Number(chainId), 
            account as `0x${string}`
          );
          const gasAssetDetails = await getNativeAssetDetails(Number(chainId), account as `0x${string}`);
          
          // if user have not gas fee to cover the payment, return null
          if(gasAssetDetails.balance <= BigInt(0)) {
            return null;
          }
        }
        // Handle native tokens (ETH, etc.)
        else if(assetNamespace === 'slip44') {
          assetDetails = await getNativeAssetDetails(Number(chainId), account as `0x${string}`);
        }
          // Check if user has any balance
          if(assetDetails.balance > BigInt(0)) {
            isUserHaveAtleastOneMatchingAssets = true;
            
            // Convert payment amount to comparable format
            const paymentAmount = hexToNumber(payment.amount);
            
            // Skip if insufficient balance
            if (assetDetails.balance < BigInt(paymentAmount)) return null;
            
            // Get chain data for additional metadata
            const chainData = getChainData(`${chainNamespace}:${chainId}`);
            const tokenDetails = getTokenData(assetDetails.symbol);
            
            return {
              ...payment,
              assetMetadata: {
                assetIcon: tokenDetails?.icon || '',
                assetName: assetDetails.name,
                assetSymbol: assetDetails.symbol,
                assetNamespace: assetNamespace,
                assetDecimals: assetDetails.decimals
              },
              chainMetadata: {
                chainId: chainId,
                chainName: chainData?.name || '',
                chainNamespace: chainNamespace,
                chainIcon: chainData?.logo || ''
              }
            };
          }
        
        return null;
      } catch (error) {
        console.error('Error processing payment option:', error);
        return null;
      }
    });
    
    // Resolve all promises
    const paymentResults = await Promise.all(paymentPromises);
    
    // Filter out null values
    const feasibleDirectPayments = paymentResults.filter(
      (payment): payment is DetailedPaymentOption => payment !== null
    );
    
    return {
      feasibleDirectPayments,
      isUserHaveAtleastOneMatchingAssets
    };
  },

  async processFeasibleContractPayments(
    contractPayments: PaymentOption[],
  ): Promise<{
    feasibleContractPayments: DetailedPaymentOption[]
    isUserHaveAtleastOneMatchingAssets: boolean
  }> {
    let isUserHaveAtleastOneMatchingAssets = false
    const account = SettingsStore.state.eip155Address
    const feasibleContractPayments = await Promise.all(
      contractPayments.map(async payment => {
        try {
          
          const { asset, contractInteraction } = payment
          const { chainId, assetAddress, chainNamespace, assetNamespace } =
            this.getAssetDetails(asset)

          // Verify contract interaction data and simulate transaction if available
          if (contractInteraction?.data) {
            if (Array.isArray(contractInteraction.data)) {
              await TransactionSimulatorUtil.simulateAndCheckERC20Transfer(
                chainId,
                account as `0x${string}`,
                contractInteraction.data as { to: string; value: string; data: string }[]
              )
            } else{
              throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
            }
          }

          let assetDetails = {balance: BigInt(0), decimals: 0, symbol: '', name: ''};
        // Handle ERC20 tokens
        if(assetNamespace === 'erc20') {
          assetDetails = await getErc20TokenDetails(
            assetAddress as `0x${string}`, 
            Number(chainId), 
            account as `0x${string}`
          );
          const gasAssetDetails = await getNativeAssetDetails(Number(chainId), account as `0x${string}`);
          // if user have not gas fee to cover the payment, return null
          if(gasAssetDetails.balance <= BigInt(0)) {
            return null;
          }
        }
        // Handle native tokens (ETH, etc.)
        else if(assetNamespace === 'slip44') {
          assetDetails = await getNativeAssetDetails(Number(chainId), account as `0x${string}`);
        }
          // Check if user has any balance
          if(assetDetails.balance > BigInt(0)) {
            isUserHaveAtleastOneMatchingAssets = true;
            
            // Convert payment amount to comparable format
            const paymentAmount = hexToNumber(payment.amount);
            
            // Skip if insufficient balance
            if (assetDetails.balance < BigInt(paymentAmount)) return null;
            
            // Get chain data for additional metadata
            const chainData = getChainData(`${chainNamespace}:${chainId}`);
            const tokenDetails = getTokenData(assetDetails.symbol);
            
            return {
              ...payment,
              assetMetadata: {
                assetIcon: tokenDetails?.icon || '/token-logos/token-placeholder.svg',
                assetName: assetDetails.name,
                assetSymbol: assetDetails.symbol,
                assetNamespace: assetNamespace,
                assetDecimals: assetDetails.decimals
              },
              chainMetadata: {
                chainId: chainId,
                chainName: chainData?.name || '',
                chainNamespace: chainNamespace,
                chainIcon: chainData?.logo || '/chain-logos/chain-placeholder.svg'
              }
            };
          }
        
        return null;
        } catch (error) {
          console.error('Error processing payment option:', error)
          return null // Return null on error to be filtered out
        }
      })
    )

    // Filter out null values to get only feasible payment options
    const validPayments = feasibleContractPayments.filter(
      (asset): asset is DetailedPaymentOption => asset !== null
    )

    return {
      feasibleContractPayments: validPayments,
      isUserHaveAtleastOneMatchingAssets
    }
  },
  // Response formatting methods
  response: {
    /**
     * Format a successful checkout response
     *
     * @param id - The request ID
     * @param result - The successful result data
     * @returns Formatted JSON-RPC success response
     */
    formatSuccess<T>(id: number, result: T): { jsonrpc: string; id: number; result: T } {
      return {
        jsonrpc: '2.0',
        id,
        result
      }
    },

    /**
     * Format an error checkout response
     *
     * @param id - The request ID
     * @param error - The error to format
     * @returns Formatted JSON-RPC error response
     */
    formatError(
      id: number,
      error: Error | CheckoutError | unknown
    ): { jsonrpc: string; id: number; error: { code: number; message: string; data?: any } } {
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
        id,
        error: {
          code,
          message,
          data
        }
      }
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

/**
 * React hook to prepare a checkout request
 * @param request - The checkout request from the dApp
 * @param address - User's wallet address
 * @returns Object with loading state, error, and feasible payments
 */
export function useCheckoutRequestPreparation(request: any, address: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [feasiblePayments, setFeasiblePayments] = useState<DetailedPaymentOption[]>([])

  useEffect(() => {
    async function prepareRequest() {
      if (!request?.params?.[0] || !address) {
        setIsLoading(false)
        return
      }

      try {
        const { feasiblePayments } = await WalletCheckoutUtil.prepareCheckoutRequest(
          address,
          request.params[0]
        )
        setFeasiblePayments(feasiblePayments)
      } catch (err) {
        console.error('Error preparing checkout request:', err)
        setError(err instanceof Error ? err : new Error('Failed to prepare checkout request'))
      } finally {
        setIsLoading(false)
      }
    }

    prepareRequest()
  }, [request, address])

  return { isLoading, error, feasiblePayments }
}

export async function getNativeAssetDetails( chainId: number, account: `0x${string}`): Promise<{balance: bigint, decimals: number, symbol: string, name: string}> {
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http(EIP155_CHAINS[`eip155:${chainId}`].rpc)
  })
  const balance = await publicClient.getBalance({
    address: account
  })
  return {
    balance: balance,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
  }
}


export async function getErc20TokenDetails(
  tokenAddress: Hex,
  chainId: number,
  account: Hex,
): Promise<{balance: bigint, decimals: number, symbol: string, name: string}> {
  const publicClient = createPublicClient({
    chain: getChainById(chainId),
    transport: http(EIP155_CHAINS[`eip155:${chainId}`].rpc)
  })
  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient
  })

  const [balance, decimals, symbol, name] = await Promise.all([
    contract.read.balanceOf([account]),
    contract.read.decimals(),
    contract.read.symbol(),
    contract.read.name()
  ])


  return {balance: balance, decimals: decimals, symbol: symbol, name: name}
}