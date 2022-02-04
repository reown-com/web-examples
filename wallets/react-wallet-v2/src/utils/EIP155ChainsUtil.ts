/**
 * @desc Refference list of eip155 chains
 * @url https://chainlist.org
 */

export const LOGO_BASE_URL = 'https://blockchain-api.xyz/logos/'

export const MAINNET_CHAINS = {
  '1': {
    name: 'Ethereum',
    logo: LOGO_BASE_URL + 'eip155:1.png',
    rgb: '99, 125, 234'
  },
  '10': {
    name: 'Optimism',
    logo: LOGO_BASE_URL + 'eip155:10.png',
    rgb: '233, 1, 1'
  },
  '100': {
    name: 'Gnosis',
    logo: LOGO_BASE_URL + 'eip155:100.png',
    rgb: '73, 169, 166'
  },
  '137': {
    name: 'Polygon',
    logo: LOGO_BASE_URL + 'eip155:137.png',
    rgb: '130, 71, 229'
  },
  '42161': {
    name: 'Arbitrum',
    logo: LOGO_BASE_URL + 'eip155:42161.png',
    rgb: '44, 55, 75'
  }
}
