/**
 * Types
 */
export type TXRPLChain = keyof typeof XRPL_CHAINS

/**
 * Chains
 */
export const XRPL_MAINNET_CHAINS = {
  'xrpl:0': {
    chainId: '0',
    name: 'XRPL',
    logo: '/chain-logos/xrpl.png',
    rgb: '36, 41, 46',
    rpc: 'wss://xrplcluster.com'
  }
}

export const XRPL_TESTNET_CHAINS = {
  'xrpl:1': {
    chainId: '1',
    name: 'XRPL Testnet',
    logo: '/chain-logos/xrpl.png',
    rgb: '36, 41, 46',
    rpc: 'wss://testnet.xrpl-labs.com'
  }
}

export const XRPL_CHAINS = { ...XRPL_MAINNET_CHAINS, ...XRPL_TESTNET_CHAINS }

/**
 * Methods
 */
export const XRPL_SIGNING_METHODS = {
  XRPL_SIGN_TRANSACTION: 'xrpl_signTransaction',
  XRPL_SIGN_TRANSACTION_FOR: 'xrpl_signTransactionFor'
}
