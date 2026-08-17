type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  rpc: string
  namespace: string
  symbol: string
}

export type TStellarChain = keyof typeof STELLAR_MAINNET_CHAINS

export const STELLAR_MAINNET_CHAINS: Record<string, ChainMetadata> = {
  'stellar:pubnet': {
    chainId: 'pubnet',
    name: 'Stellar',
    logo: '/chain-logos/stellar.png',
    rgb: '15, 15, 15',
    rpc: 'https://horizon.stellar.org',
    namespace: 'stellar',
    symbol: 'XLM'
  }
}

export const STELLAR_TEST_CHAINS: Record<string, ChainMetadata> = {
  'stellar:testnet': {
    chainId: 'testnet',
    name: 'Stellar Testnet',
    logo: '/chain-logos/stellar.png',
    rgb: '15, 15, 15',
    rpc: 'https://horizon-testnet.stellar.org',
    namespace: 'stellar',
    symbol: 'XLM'
  }
}

export const STELLAR_CHAINS = { ...STELLAR_MAINNET_CHAINS, ...STELLAR_TEST_CHAINS }

/**
 * WalletConnect JSON-RPC methods supported by the Stellar namespace.
 * See the Stellar WalletConnect specs (stellar_signXDR / signAndSubmitXDR /
 * signMessage / signAuthEntry).
 */
export const STELLAR_SIGNING_METHODS = {
  STELLAR_SIGN_XDR: 'stellar_signXDR',
  STELLAR_SIGN_AND_SUBMIT_XDR: 'stellar_signAndSubmitXDR',
  STELLAR_SIGN_MESSAGE: 'stellar_signMessage',
  STELLAR_SIGN_AUTH_ENTRY: 'stellar_signAuthEntry'
}
