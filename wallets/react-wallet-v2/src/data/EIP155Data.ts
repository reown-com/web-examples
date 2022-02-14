/**
 * @desc Refference list of eip155 chains
 * @url https://chainlist.org
 */

/**
 * Types
 */
export type TChain = keyof typeof MAINNET_CHAINS

/**
 * Utilities
 */
export const LOGO_BASE_URL = 'https://blockchain-api.xyz/logos/'

/**
 * Chains
 */
export const MAINNET_CHAINS = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    logo: LOGO_BASE_URL + 'eip155:1.png',
    rgb: '99, 125, 234'
  },
  'eip155:10': {
    chainId: 10,
    name: 'Optimism',
    logo: LOGO_BASE_URL + 'eip155:10.png',
    rgb: '233, 1, 1'
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    logo: LOGO_BASE_URL + 'eip155:137.png',
    rgb: '130, 71, 229'
  },
  'eip155:42161': {
    chainId: 42161,
    name: 'Arbitrum',
    logo: LOGO_BASE_URL + 'eip155:42161.png',
    rgb: '44, 55, 75'
  }
}

/**
 * Methods
 */
export const SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  SEND_TRANSACTION: 'eth_sendTransaction',
  SIGN: 'eth_sign',
  SIGN_TRANSACTION: 'eth_signTransaction',
  SIGN_TYPED_DATA: 'eth_signTypedData',
  SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4'
}
