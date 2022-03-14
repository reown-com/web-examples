/**
 * Types
 */
export type TSolanaChain = keyof typeof SOLANA_MAINNET_CHAINS

/**
 * Chains
 */
export const SOLANA_MAINNET_CHAINS = {
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': {
    chainId: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
    name: 'Solana',
    logo: '/chain-logos/solana-4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ.png',
    rgb: '30, 240, 166',
    rpc: ''
  }
}

/**
 * Methods
 */
export const SOLANA_SIGNING_METHODS = {
  SOLANA_SIGN_TRANSACTION: 'solana_signTransaction',
  SOLANA_SIGN_MESSAGE: 'solana_signMessage'
}
