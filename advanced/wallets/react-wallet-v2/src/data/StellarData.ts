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
