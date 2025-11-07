/**
 * Types
 */
export type TTronChain = keyof typeof TRON_MAINNET_CHAINS

interface TRONChains {
  [key: string]: ChainMetadata
}

type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  fullNode: string
  namespace: string
}

/**
 * Chains
 */
export const TRON_MAINNET_CHAINS: TRONChains = {
  'tron:0x2b6653dc': {
    chainId: '0x2b6653dc',
    name: 'Tron',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://api.trongrid.io',
    namespace: 'tron'
  }
}

export const TRON_TEST_CHAINS: TRONChains = {
  'tron:0xcd8690dc': {
    chainId: '0xcd8690dc',
    name: 'Tron Testnet',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://nile.trongrid.io/',
    namespace: 'tron'
  }
}

export const TRON_CHAINS = { ...TRON_MAINNET_CHAINS, ...TRON_TEST_CHAINS }

/**
 * Methods
 */
export const TRON_SIGNING_METHODS = {
  TRON_SIGN_TRANSACTION: 'tron_signTransaction',
  TRON_SIGN_MESSAGE: 'tron_signMessage'
}
