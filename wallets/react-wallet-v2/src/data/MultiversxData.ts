/**
 * Types
 */
export type TMultiversxChain = keyof typeof MULTIVERSX_MAINNET_CHAINS

/**
 * Chains
 */
export const MULTIVERSX_MAINNET_CHAINS = {
  'multiversx:1': {
    chainId: '1',
    name: 'MultiversX',
    logo: '/chain-logos/multiversx-1.svg',
    rgb: '43, 45, 46',
    rpc: ''
  }
}

export const MULTIVERSX_TEST_CHAINS = {
  'multiversx:D': {
    chainId: 'D',
    name: 'MultiversX Devnet',
    logo: '/chain-logos/multiversx-1.svg',
    rgb: '43, 45, 46',
    rpc: ''
  }
  // Keep only one Test Chain visible
  // 'multiversx:T': {
  //   chainId: 'T',
  //   name: 'Multiversx Testnet',
  //   logo: '/chain-logos/multiversx-1.svg',
  //   rgb: '43, 45, 46',
  //   rpc: ''
  // }
}

export const MULTIVERSX_CHAINS = { ...MULTIVERSX_MAINNET_CHAINS, ...MULTIVERSX_TEST_CHAINS }

/**
 * Methods
 */
export const MULTIVERSX_SIGNING_METHODS = {
  MULTIVERSX_SIGN_TRANSACTION: 'multiversx_signTransaction',
  MULTIVERSX_SIGN_TRANSACTIONS: 'multiversx_signTransactions',
  MULTIVERSX_SIGN_MESSAGE: 'multiversx_signMessage',
  MULTIVERSX_SIGN_LOGIN_TOKEN: 'multiversx_signLoginToken'
}
