/**
 * @desc Refference list of eip155 chains
 * @url https://chainlist.org
 */

/**
 * Utilities
 */
const LOGO_BASE_URL = 'https://blockchain-api.xyz/logos/'

/**
 * Types
 */
export type TEIP155Chain = keyof typeof EIP155_CHAINS

/**
 * Chains
 */
export const EIP155_CHAINS = {
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

export const EIP155_TEST_CHAINS = {
  'eip155:4': {
    chainId: 4,
    name: 'Ethereum Rinkeby',
    logo: LOGO_BASE_URL + 'eip155:1.png',
    rgb: '99, 125, 234'
  },
  'eip155:69': {
    chainId: 69,
    name: 'Optimism Kovan',
    logo: LOGO_BASE_URL + 'eip155:10.png',
    rgb: '233, 1, 1'
  },
  'eip155:80001': {
    chainId: 80001,
    name: 'Polygon Mumbai',
    logo: LOGO_BASE_URL + 'eip155:137.png',
    rgb: '130, 71, 229'
  },
  'eip155:421611': {
    chainId: 421611,
    name: 'Arbitrum Rinkeby',
    logo: LOGO_BASE_URL + 'eip155:42161.png',
    rgb: '44, 55, 75'
  }
}

/**
 * Methods
 */
export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_SIGN_TRANSACTION: 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ETH_SIGN_RAW_TRANSACTION: 'eth_sendRawTransaction',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction'
}
