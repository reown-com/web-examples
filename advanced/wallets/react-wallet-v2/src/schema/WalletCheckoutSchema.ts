import { ContractInteraction } from '@/types/wallet_checkout'
import { z } from 'zod'
// Define Zod schemas for validation
export const ProductMetadataSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.string().optional()
})

export const ContractInteractionSchema = z.object({
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

export const PaymentOptionSchema = z
  .object({
    asset: z
      .string()
      .min(1, 'Asset is required')
      .refine(isValidCAIP19AssetId, 'Invalid CAIP-19 asset'),
    amount: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Amount must be a hex string'),
    recipient: z.string().refine(isValidCAIP10AccountId, 'Invalid CAIP-10 recipient').optional(),
    contractInteraction: ContractInteractionSchema.refine(
      isValidContractInteraction,
      'Invalid contract interaction'
    ).optional()
  })
  .refine(
    data =>
      (data.recipient && !data.contractInteraction) ||
      (!data.recipient && data.contractInteraction),
    'Either recipient or contractInteraction must be provided, but not both'
  )
  .refine(data => {
    if (!data.recipient) return true
    return matchingChainIds(data.asset, data.recipient)
  }, 'Asset and recipient must be on the same chain')

export const CheckoutRequestSchema = z.object({
  orderId: z.string().max(128, 'Order ID must not exceed 128 characters'),
  acceptedPayments: z.array(PaymentOptionSchema).min(1, 'At least one payment option is required'),
  products: z.array(ProductMetadataSchema).optional(),
  expiry: z.number().int().optional()
})

/**
 * Validates if a string follows the CAIP-19 format
 * Simple validation: chainNamespace:chainId/assetNamespace:assetReference
 *
 * @param assetId - CAIP-19 asset ID to validate
 * @returns Whether the asset ID is valid
 */
export function isValidCAIP19AssetId(assetId: string): boolean {
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
}

/**
 * Validates if a string follows the CAIP-10 format
 * Simple validation: chainNamespace:chainId:address
 *
 * @param accountId - CAIP-10 account ID to validate
 * @returns Whether the account ID is valid
 */
export function isValidCAIP10AccountId(accountId: string): boolean {
  if (typeof accountId !== 'string') return false

  // Basic check: should be in format namespace:chainId:address
  const parts = accountId.split(':')
  return parts.length === 3 && parts[0]?.length > 0 && parts[1]?.length > 0 && parts[2]?.length > 0
}

/**
 * Checks if a contract interaction is valid
 *
 * @param contractInteraction - Contract interaction to validate
 * @returns Whether the contract interaction is valid
 */
export function isValidContractInteraction(
  contractInteraction: ContractInteraction | undefined
): boolean {
  if (!contractInteraction) return false

  return (
    typeof contractInteraction === 'object' &&
    typeof contractInteraction.type === 'string' &&
    contractInteraction.type.trim() !== '' &&
    typeof contractInteraction.data === 'object' &&
    contractInteraction.data !== null
  )
}

/**
 * Checks if the chain IDs in the asset and recipient match
 *
 * @param assetId - CAIP-19 asset ID
 * @param accountId - CAIP-10 account ID
 * @returns Whether the chain IDs match
 */
export function matchingChainIds(assetId: string, accountId: string): boolean {
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
}
