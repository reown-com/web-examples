/**
 * Types
 */
export type TPolkadotChain = keyof typeof POLKADOT_MAINNET_CHAINS

/**
 * Chains
 */
export const POLKADOT_MAINNET_CHAINS = {
  'polkadot:91b171bb158e2d3848fa23a9f1c25182': {
    chainId: '91b171bb158e2d3848fa23a9f1c25182',
    name: 'Polkadot',
    logo: '/chain-logos/polkadot.png',
    rgb: '107, 111, 147',
    rpc: ''
  }
}

/**
 * Methods
 */
export const POLKADOT_SIGNING_METHODS = {
  POLKADOT_SIGN_TRANSACTION: 'polkadot_signTransaction',
  POLKADOT_SIGN_MESSAGE: 'polkadot_signMessage'
}
