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
    logo: '/chain-logos/polkadot.svg',
    rgb: '230, 1, 122',
    rpc: ''
  }
}

export const POLKADOT_TEST_CHAINS = {
  'polkadot:e143f23803ac50e8f6f8e62695d1ce9e': {
    chainId: 'e143f23803ac50e8f6f8e62695d1ce9e',
    name: 'Polkadot Westend',
    logo: '/chain-logos/westend.svg',
    rgb: '218, 104, 167',
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
