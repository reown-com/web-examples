import {
  CheckoutErrorCode,
  ContractInteraction,
  createCheckoutError,
  SolanaContractInteraction
} from '@/types/wallet_checkout'
import { z } from 'zod'

// ======== Helper Validation Functions ========

/**
 * Validates if a string follows the CAIP-19 format
 * Simple validation: chainNamespace:chainId/assetNamespace:assetReference
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
    assetParts.length === 2 &&
    assetParts[0]?.length > 0 &&
    assetParts[1]?.length > 0
  )
}

/**
 * Validates if a string follows the CAIP-10 format
 * Simple validation: chainNamespace:chainId:address
 */
export function isValidCAIP10AccountId(accountId: string): boolean {
  if (typeof accountId !== 'string') return false

  // Basic check: should be in format namespace:chainId:address
  const parts = accountId.split(':')
  return parts.length === 3 && parts[0]?.length > 0 && parts[1]?.length > 0 && parts[2]?.length > 0
}

/**
 * Validates if a Solana instruction is valid
 */
export function isValidSolanaInstruction(instruction: SolanaContractInteraction['data']): boolean {
  try {
    if (!instruction || typeof instruction !== 'object') return false

    // Check for required properties
    if (!instruction.programId || typeof instruction.programId !== 'string') return false
    if (!instruction.accounts || !Array.isArray(instruction.accounts)) return false
    if (!instruction.data || typeof instruction.data !== 'string') return false

    // Validate each account
    for (const account of instruction.accounts) {
      if (!account || typeof account !== 'object') return false
      if (!account.pubkey || typeof account.pubkey !== 'string') return false
      if (typeof account.isSigner !== 'boolean') return false
      if (typeof account.isWritable !== 'boolean') return false
    }

    return true
  } catch (e) {
    return false
  }
}

/**
 * Checks if an EVM call is valid
 */
export function isValidEvmCall(call: { to: string; data: string; value?: string }): boolean {
  if (!call.to || typeof call.to !== 'string') return false
  if (!call.data || typeof call.data !== 'string') return false
  // Check value only if it's provided
  if (call.value !== undefined && (typeof call.value !== 'string' || !call.value)) return false
  return true
}

/**
 * Checks if the chain IDs in the asset and recipient match
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

/**
 * Validates Solana-specific asset format
 */
function validateSolanaAsset(asset: string, ctx: z.RefinementCtx) {
  const assetParts = asset.split('/')
  if (assetParts.length !== 2) return

  const chainParts = assetParts[0].split(':')
  if (chainParts[0] !== 'solana') return

  // For Solana assets, validate asset namespace and reference
  const assetType = assetParts[1].split(':')
  if (assetType.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid Solana asset format: ${asset}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Invalid Solana asset format: ${asset}`
    )
  }

  // Check supported Solana asset namespaces
  if (assetType[0] !== 'slip44' && assetType[0] !== 'token') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unsupported Solana asset namespace: ${assetType[0]}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Unsupported Solana asset namespace: ${assetType[0]}`
    )
  }

  // For slip44, validate the coin type is 501 for SOL
  if (assetType[0] === 'slip44' && assetType[1] !== '501') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid Solana slip44 asset reference: ${assetType[1]}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Invalid Solana slip44 asset reference: ${assetType[1]}`
    )
  }
}

/**
 * Validates EVM-specific asset format
 */
function validateEvmAsset(asset: string, ctx: z.RefinementCtx) {
  const assetParts = asset.split('/')
  if (assetParts.length !== 2) return

  const chainParts = assetParts[0].split(':')
  if (chainParts[0] !== 'eip155') return

  // For EVM assets, validate asset namespace and reference
  const assetType = assetParts[1].split(':')
  if (assetType.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid EVM asset format: ${asset}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Invalid EVM asset format: ${asset}`
    )
  }

  // Check supported EVM asset namespaces
  if (assetType[0] !== 'slip44' && assetType[0] !== 'erc20') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unsupported EVM asset namespace: ${assetType[0]}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Unsupported EVM asset namespace: ${assetType[0]}`
    )
  }

  // For slip44, validate the coin type is 60 for ETH
  if (assetType[0] === 'slip44' && assetType[1] !== '60') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid EVM slip44 asset reference: ${assetType[1]}`
    })
    throw createCheckoutError(
      CheckoutErrorCode.INVALID_CHECKOUT_REQUEST,
      `Invalid EVM slip44 asset reference: ${assetType[1]}`
    )
  }
}

/**
 * Validates asset format based on chain type
 */
function validateAssetFormat(asset: string, ctx: z.RefinementCtx) {
  const assetParts = asset.split('/')
  if (assetParts.length !== 2) return

  const chainParts = assetParts[0].split(':')

  // Validate based on chain namespace
  switch (chainParts[0]) {
    case 'solana':
      validateSolanaAsset(asset, ctx)
      break
    case 'eip155':
      validateEvmAsset(asset, ctx)
      break
  }
}

// ======== Basic Schema Definitions ========

export const ProductMetadataSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.string().optional()
})

export const SolanaAccountSchema = z.object({
  pubkey: z.string().min(1, 'Account public key is required'),
  isSigner: z.boolean(),
  isWritable: z.boolean()
})

export const SolanaInstructionDataSchema = z.object({
  programId: z.string().min(1, 'Program ID is required'),
  accounts: z.array(SolanaAccountSchema).min(1, 'At least one account is required'),
  data: z.string().min(1, 'Instruction data is required')
})

// ======== Contract Interaction Schemas ========

const EvmCallSchema = z
  .object({
    to: z.string().min(1),
    data: z.string().min(1),
    value: z.string().optional()
  })
  .refine(isValidEvmCall, {
    message: 'Invalid EVM call data'
  })

const SolanaInstructionSchema = z
  .object({
    programId: z.string().min(1),
    accounts: z.array(SolanaAccountSchema).min(1),
    data: z.string().min(1)
  })
  .refine(isValidSolanaInstruction, {
    message: 'Invalid Solana instruction data'
  })

export const ContractInteractionSchema = z
  .object({
    type: z.string().min(1, 'Contract interaction type is required'),
    data: z.any()
  })
  .superRefine((interaction, ctx) => {
    // Check if interaction type is supported
    if (interaction.type !== 'evm-calls' && interaction.type !== 'solana-instruction') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unsupported contract interaction type'
      })
      throw createCheckoutError(CheckoutErrorCode.UNSUPPORTED_CONTRACT_INTERACTION)
    }

    // Validate based on interaction type
    if (interaction.type === 'evm-calls') {
      validateEvmCalls(interaction, ctx)
    } else if (interaction.type === 'solana-instruction') {
      validateSolanaInstruction(interaction, ctx)
    }
  })

// Extracted validation functions for cleaner code
function validateEvmCalls(interaction: any, ctx: z.RefinementCtx) {
  if (!interaction.data || !Array.isArray(interaction.data) || interaction.data.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid EVM calls data structure'
    })
    throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
  }

  // Validate each EVM call
  for (const call of interaction.data) {
    try {
      EvmCallSchema.parse(call)
    } catch (e) {
      throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
    }
  }
}

function validateSolanaInstruction(interaction: any, ctx: z.RefinementCtx) {
  if (!interaction.data || typeof interaction.data !== 'object') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid Solana instruction data structure'
    })
    throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
  }

  try {
    SolanaInstructionSchema.parse(interaction.data)
  } catch (e) {
    throw createCheckoutError(CheckoutErrorCode.INVALID_CONTRACT_INTERACTION_DATA)
  }
}

// ======== Payment Schema Definitions ========

// Asset validation schema with chain-specific checks
const AssetSchema = z
  .string()
  .min(1, 'Asset is required')
  .refine(isValidCAIP19AssetId, 'Invalid CAIP-19 asset')
  .superRefine(validateAssetFormat)

export const PaymentOptionSchema = z
  .object({
    asset: AssetSchema,
    amount: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Amount must be a hex string'),
    recipient: z.string().refine(isValidCAIP10AccountId, 'Invalid CAIP-10 recipient').optional(),
    contractInteraction: ContractInteractionSchema.optional()
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

// ======== Checkout Request Schema ========

export const CheckoutRequestSchema = z.object({
  orderId: z.string().max(128, 'Order ID must not exceed 128 characters'),
  acceptedPayments: z.array(PaymentOptionSchema).min(1, 'At least one payment option is required'),
  products: z.array(ProductMetadataSchema).optional(),
  expiry: z.number().int().optional()
})
