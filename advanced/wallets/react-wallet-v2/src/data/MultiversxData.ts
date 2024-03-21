/**
 * Types
 */
export type TMultiversxChain = keyof typeof MULTIVERSX_MAINNET_CHAINS

/**
 * Chains
 */
export const MULTIVERSX_MAINNET_CHAINS = {
  'mvx:1': {
    chainId: '1',
    name: 'MultiversX',
    logo: '/chain-logos/multiversx-1.svg',
    rgb: '43, 45, 46',
    rpc: '',
    namespace: 'mvx'
  }
}

export const MULTIVERSX_TEST_CHAINS = {
  'mvx:D': {
    chainId: 'D',
    name: 'MultiversX Devnet',
    logo: '/chain-logos/multiversx-1.svg',
    rgb: '43, 45, 46',
    rpc: '',
    namespace: 'mvx'
  }
  // Keep only one Test Chain visible
  // 'mvx:T': {
  //   chainId: 'T',
  //   name: 'MultiversX Testnet',
  //   logo: '/chain-logos/multiversx-1.svg',
  //   rgb: '43, 45, 46',
  //   rpc: '',
  //   namespace: 'mvx'
  // }
}

export const MULTIVERSX_CHAINS = { ...MULTIVERSX_MAINNET_CHAINS, ...MULTIVERSX_TEST_CHAINS }

/**
 * Methods
 */
export const MULTIVERSX_SIGNING_METHODS = {
  MULTIVERSX_SIGN_TRANSACTION: 'mvx_signTransaction',
  MULTIVERSX_SIGN_TRANSACTIONS: 'mvx_signTransactions',
  MULTIVERSX_SIGN_MESSAGE: 'mvx_signMessage',
  MULTIVERSX_SIGN_LOGIN_TOKEN: 'mvx_signLoginToken',
  MULTIVERSX_SIGN_NATIVE_AUTH_TOKEN: 'mvx_signNativeAuthToken',
  MULTIVERSX_CANCEL_ACTION: 'mvx_cancelAction'
}
