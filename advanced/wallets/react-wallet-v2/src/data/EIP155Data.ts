/**
 * @desc Refference list of eip155 chains
 * @url https://chainlist.org
 */

/**
 * Types
 */
export type TEIP155Chain = keyof typeof EIP155_CHAINS

export type EIP155Chain = {
  chainId: number
  name: string
  logo: string
  rgb: string
  rpc: string
  namespace: string
  smartAccountEnabled?: boolean
}
const blockchainApiRpc = (chainId: number) => {
  return `https://rpc.walletconnect.org/v1?chainId=eip155:${chainId}&projectId=${process.env.NEXT_PUBLIC_PROJECT_ID}`
}
/**
 * Chains
 */
export const EIP155_MAINNET_CHAINS: Record<string, EIP155Chain> = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: blockchainApiRpc(1),
    namespace: 'eip155'
  },
  'eip155:43114': {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    logo: '/chain-logos/eip155-43113.png',
    rgb: '232, 65, 66',
    rpc: blockchainApiRpc(43114),
    namespace: 'eip155'
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    logo: '/chain-logos/eip155-137.png',
    rgb: '130, 71, 229',
    rpc: blockchainApiRpc(137),
    namespace: 'eip155'
  },
  'eip155:10': {
    chainId: 10,
    name: 'Optimism',
    logo: '/chain-logos/eip155-10.png',
    rgb: '235, 0, 25',
    rpc: blockchainApiRpc(10),
    namespace: 'eip155'
  },
  'eip155:324': {
    chainId: 324,
    name: 'zkSync Era',
    logo: '/chain-logos/eip155-324.svg',
    rgb: '242, 242, 242',
    rpc: blockchainApiRpc(324),
    namespace: 'eip155'
  },
  'eip155:8453': {
    chainId: 8453,
    name: 'Base',
    logo: '/chain-logos/base.webp',
    rgb: '22, 83, 241',
    rpc: blockchainApiRpc(8453),
    namespace: 'eip155'
  },
  'eip155:42161': {
    chainId: 42161,
    name: 'Arbitrum',
    logo: '/chain-logos/arbitrum.webp',
    rgb: '27, 74, 220',
    rpc: blockchainApiRpc(42161),
    namespace: 'eip155'
  }
}

export const EIP155_TEST_CHAINS: Record<string, EIP155Chain> = {
  'eip155:5': {
    chainId: 5,
    name: 'Ethereum Goerli',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: blockchainApiRpc(5),
    namespace: 'eip155',
    smartAccountEnabled: true
  },
  'eip155:11155111': {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: blockchainApiRpc(11155111),
    namespace: 'eip155',
    smartAccountEnabled: true
  },
  'eip155:43113': {
    chainId: 43113,
    name: 'Avalanche Fuji',
    logo: '/chain-logos/eip155-43113.png',
    rgb: '232, 65, 66',
    rpc: blockchainApiRpc(43113),
    namespace: 'eip155'
  },
  'eip155:80001': {
    chainId: 80001,
    name: 'Polygon Mumbai',
    logo: '/chain-logos/eip155-137.png',
    rgb: '130, 71, 229',
    rpc: blockchainApiRpc(80001),
    namespace: 'eip155',
    smartAccountEnabled: true
  },
  'eip155:420': {
    chainId: 420,
    name: 'Optimism Goerli',
    logo: '/chain-logos/eip155-10.png',
    rgb: '235, 0, 25',
    rpc: blockchainApiRpc(420),
    namespace: 'eip155'
  },
  'eip155:11155420': {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    logo: '/chain-logos/eip155-10.png',
    rgb: '235, 0, 25',
    rpc: blockchainApiRpc(11155420),
    namespace: 'eip155'
  },
  'eip155:280': {
    chainId: 280,
    name: 'zkSync Era Testnet',
    logo: '/chain-logos/eip155-324.svg',
    rgb: '242, 242, 242',
    rpc: blockchainApiRpc(280),
    namespace: 'eip155'
  },
  'eip155:84532': {
    chainId: 84532,
    name: 'Base Sepolia',
    logo: '/chain-logos/base.webp',
    rgb: '22, 83, 241',
    rpc: blockchainApiRpc(84532),
    namespace: 'eip155',
    smartAccountEnabled: true
  }
}

export const EIP155_CHAINS = { ...EIP155_MAINNET_CHAINS, ...EIP155_TEST_CHAINS }

/**
 * Methods
 */
export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_SIGN_TRANSACTION: 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction'
}
