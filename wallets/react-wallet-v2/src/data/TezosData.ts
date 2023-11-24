type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  rpc: string
  namespace: string
}

/**
 * Types
 */
export type TTezosChain = keyof typeof TEZOS_MAINNET_CHAINS

/**
 * Chains
 */
export const TEZOS_MAINNET_CHAINS: Record<string, ChainMetadata> = {
  'tezos:mainnet': {
    chainId: 'mainnet',
    name: 'Tezos',
    logo: '/chain-logos/tezos.svg',
    rgb: '44, 125, 247',
    rpc: 'https://mainnet.api.tez.ie',
    namespace: 'tezos'
  }
}

export const TEZOS_TEST_CHAINS: Record<string, ChainMetadata> = {
  'tezos:testnet': {
    chainId: 'testnet',
    name: 'Tezos Testnet',
    logo: '/chain-logos/tezos.svg',
    rgb: '44, 125, 247',
    rpc: 'https://ghostnet.ecadinfra.com',
    namespace: 'tezos'
  }
}

export const TEZOS_CHAINS = { ...TEZOS_MAINNET_CHAINS, ...TEZOS_TEST_CHAINS }

/**
 * Methods
 */
export const TEZOS_SIGNING_METHODS = {
  TEZOS_GET_ACCOUNTS: 'tezos_getAccounts',
  TEZOS_SEND: 'tezos_send',
  TEZOS_SIGN: 'tezos_sign'
}
