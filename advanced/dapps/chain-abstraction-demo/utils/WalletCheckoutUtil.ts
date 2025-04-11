import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { encodeFunctionData, parseEther, toHex } from 'viem'
import { erc20Abi } from 'viem'

import { baseSepolia, optimismSepolia } from '@reown/appkit/networks'

import type {
  EvmContractInteraction,
  PaymentOption,
  SolanaContractInteraction
} from '@/types/wallet_checkout'

// Chain IDs for supported testnets
export type AllowedChainId = 84532 | 11155420

export const ALLOWED_CHAINS = [baseSepolia, optimismSepolia]

/**
 * Token symbol to address mapping for each supported chain
 */
export const TOKEN_CONFIG: Record<number, Record<string, string>> = {
  // Base Sepolia tokens
  [baseSepolia.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  },
  // Optimism Sepolia tokens
  [optimismSepolia.id]: {
    USDC: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
  }
}

/**
 * Get token address by chain ID and symbol
 */
export function getTokenAddress(chainId: number, symbol: string): string | undefined {
  return TOKEN_CONFIG[chainId]?.[symbol]
}

/**
 * Get token symbol by chain ID and address
 */
export function getTokenSymbol(chainId: number, address: string): string | undefined {
  const tokenMap = TOKEN_CONFIG[chainId]
  if (!tokenMap) {
    return undefined
  }

  const entry = Object.entries(tokenMap).find(
    ([_, tokenAddress]) => tokenAddress.toLowerCase() === address.toLowerCase()
  )

  return entry?.[0]
}

/**
 * Get token symbol from a CAIP-19 asset identifier
 * Example formats:
 * - 'eip155:11155111/erc20:0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' (ERC20 token)
 * - 'eip155:11155111/slip44:60' (Native ETH)
 */
export function getTokenSymbolFromAsset(asset?: string): string {
  // Handle undefined or empty asset
  if (!asset) {
    return 'Unknown'
  }

  // Extract parts from the asset identifier
  const parts = asset.split('/')
  const chainPart = parts[0]?.split(':') || []
  const chainId = Number(chainPart[1] || '0')

  // Handle only known token types Case 1: Native ETH (slip44:60) - this is standard for Ethereum
  if (parts[1]?.startsWith('slip44:60')) {
    return 'ETH'
  }

  // Case 2: ERC20 tokens - check if we know this specific token
  if (parts[1]?.startsWith('erc20:')) {
    const tokenAddress = parts[1].split(':')[1]
    if (tokenAddress) {
      // Look up symbol in our config
      const symbol = getTokenSymbol(chainId, tokenAddress)
      if (symbol) {
        return symbol
      }

      // For unknown ERC20, display a shortened address
      return `0x${tokenAddress.substring(0, 4)}..${tokenAddress.substring(tokenAddress.length - 4)}`
    }
  }

  // For all other cases, return "Unknown" with chainId if available for some context
  return chainId ? `Unknown (Chain ${chainId})` : 'Unknown Asset'
}

// Helper function to get chain name from chain ID
export function getChainName(chainId: string | number): string {
  const chain = ALLOWED_CHAINS.find(c => c.id === Number(chainId))

  return chain?.name || `Chain ${chainId}`
}

// Get token options for the selected chain
export function getTokenOptions(
  chainId: number
): { address: string; name: string; symbol: string }[] {
  const tokensByChain = TOKEN_CONFIG[chainId]
  if (!tokensByChain) {
    return []
  }

  return Object.entries(tokensByChain).map(([symbol, address]) => ({
    symbol,
    address,
    name: `${symbol} on ${getChainName(chainId)}`
  }))
}

// Get token symbol by address and chainId
export function getTokenSymbolByAddress(assetString?: string): string | undefined {
  if (!assetString) {
    return undefined
  }

  // Parse CAIP-19 asset format: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'
  const assetParts = assetString.split('/')
  if (assetParts.length !== 2) {
    return undefined
  }

  const chainPart = assetParts[0]?.split(':') || []
  const tokenPart = assetParts[1]?.split(':') || []

  if (chainPart.length !== 2 || tokenPart.length !== 2) {
    return undefined
  }
  // Handle only known token types Case 1: Native ETH (slip44:60) - this is standard for Ethereum
  if (assetParts[1]?.startsWith('slip44:60')) {
    return 'ETH'
  }
  const chainId = Number(chainPart[1])
  const tokenAddress = tokenPart[1] ? tokenPart[1].toLowerCase() : ''

  // Skip lookup if tokenAddress is empty
  if (!tokenAddress) {
    return undefined
  }

  // Look up the token symbol in our token configuration
  const tokenSymbol = getTokenSymbol(chainId, tokenAddress)

  return tokenSymbol
}

// Function to shorten an address for display
export function shortenAddress(addressInput?: string): string {
  if (!addressInput) {
    return ''
  }

  // If it's a CAIP format, extract the actual address part
  let displayAddress = addressInput
  if (displayAddress.includes(':')) {
    const parts = displayAddress.split(':')
    displayAddress = parts[parts.length - 1] || ''
  }

  if (displayAddress.length <= 10) {
    return displayAddress
  }

  return `${displayAddress.substring(0, 6)}...${displayAddress.substring(displayAddress.length - 4)}`
}

export async function createTokenTransferSolanaInstruction(params: {
  sourceAddress: string
  destinationAddress: string
  tokenMintAddress: string
  amount: number
}): Promise<SolanaContractInteraction> {
  const { sourceAddress, destinationAddress, tokenMintAddress, amount } = params
  // Convert string addresses to PublicKey objects
  const sourcePublicKey = new PublicKey(sourceAddress)
  const destinationPublicKey = new PublicKey(destinationAddress)
  const tokenMintPublicKey = new PublicKey(tokenMintAddress)

  // Get the token accounts
  const sourceTokenAccount = await getAssociatedTokenAddress(tokenMintPublicKey, sourcePublicKey)

  const destinationTokenAccount = await getAssociatedTokenAddress(
    tokenMintPublicKey,
    destinationPublicKey
  )

  // Create the transfer instruction
  const transferInstruction = createTransferInstruction(
    sourceTokenAccount,
    destinationTokenAccount,
    sourcePublicKey,
    amount
  )

  // Format the instruction in the required structure
  const formattedInstruction: SolanaContractInteraction = {
    type: 'solana-instruction',
    data: {
      programId: transferInstruction.programId.toString(),
      accounts: transferInstruction.keys.map(key => ({
        pubkey: key.pubkey.toString(),
        isSigner: key.isSigner,
        isWritable: key.isWritable
      })),
      data: Buffer.from(transferInstruction.data).toString('base64')
    }
  }

  return formattedInstruction
}


