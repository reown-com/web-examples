type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  rpc: string
  namespace: string
  api?: string
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
    rpc: 'https://rpc.tzbeta.net',
    namespace: 'tezos'
  }
}

export const TEZOS_TEST_CHAINS: Record<string, ChainMetadata> = {
  'tezos:ghostnet': {
    chainId: 'ghostnet',
    name: 'Tezos Ghostnet',
    logo: '/chain-logos/tezos.svg',
    rgb: '44, 125, 247',
    rpc: 'https://rpc.ghostnet.teztnets.com',
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
