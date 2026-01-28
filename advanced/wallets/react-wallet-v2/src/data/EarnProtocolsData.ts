import { Protocol, ProtocolConfig } from '@/types/earn'

/**
 * Protocol definitions
 */
export const PROTOCOLS: Record<string, Protocol> = {
  AAVE: {
    id: 'aave',
    name: 'Aave V3',
    displayName: 'Aave V3',
    logo: 'https://cryptologos.cc/logos/aave-aave-logo.png',
    description: 'Leading decentralized lending protocol'
  },
  SPARK: {
    id: 'spark',
    name: 'Spark Protocol',
    displayName: 'Spark Protocol',
    logo: 'https://avatars.githubusercontent.com/u/113572553?s=200&v=4',
    description: 'DeFi infrastructure by MakerDAO'
  }
}

/**
 * Supported chains for Earn
 */
export const EARN_CHAINS = {
  BASE: {
    id: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org'
  },
  ETHEREUM: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com'
  },
  ARBITRUM: {
    id: 42161,
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc'
  }
}

/**
 * USDC token configurations per chain
 */
export const USDC_TOKENS = {
  [EARN_CHAINS.BASE.id]: {
    symbol: 'USDC',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  [EARN_CHAINS.ETHEREUM.id]: {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  [EARN_CHAINS.ARBITRUM.id]: {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  }
}

/**
 * Protocol configurations
 * Note: These are mock APY values. Phase 2 will fetch real-time data
 */
export const PROTOCOL_CONFIGS: ProtocolConfig[] = [
  // Aave V3 on Base
  {
    protocol: PROTOCOLS.AAVE,
    chainId: EARN_CHAINS.BASE.id,
    chainName: EARN_CHAINS.BASE.name,
    token: USDC_TOKENS[EARN_CHAINS.BASE.id],
    contracts: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
      aToken: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB'
    },
    apy: 4.35,
    tvl: '$89.2M',
    riskLevel: 'Low',
    features: {
      autoCompound: true,
      lockupPeriod: false,
      instantWithdraw: true
    }
  },
  // NOTE: Spark Protocol does not exist on Base - commenting out to prevent errors
  /*
  {
    protocol: PROTOCOLS.SPARK,
    chainId: EARN_CHAINS.BASE.id,
    chainName: EARN_CHAINS.BASE.name,
    token: USDC_TOKENS[EARN_CHAINS.BASE.id],
    contracts: {
      pool: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
      poolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac'
    },
    apy: 4.82,
    tvl: '$125.4M',
    riskLevel: 'Low',
    features: {
      autoCompound: true,
      lockupPeriod: false,
      instantWithdraw: true
    }
  },
  */
  // Aave V3 on Ethereum
  {
    protocol: PROTOCOLS.AAVE,
    chainId: EARN_CHAINS.ETHEREUM.id,
    chainName: EARN_CHAINS.ETHEREUM.name,
    token: USDC_TOKENS[EARN_CHAINS.ETHEREUM.id],
    contracts: {
      pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      poolDataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      aToken: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c'
    },
    apy: 5.12,
    tvl: '$1.2B',
    riskLevel: 'Low',
    features: {
      autoCompound: true,
      lockupPeriod: false,
      instantWithdraw: true
    }
  },
  // Spark Protocol on Ethereum
  {
    protocol: PROTOCOLS.SPARK,
    chainId: EARN_CHAINS.ETHEREUM.id,
    chainName: EARN_CHAINS.ETHEREUM.name,
    token: USDC_TOKENS[EARN_CHAINS.ETHEREUM.id],
    contracts: {
      pool: '0xC13e21B648A5Ee794902342038FF3aDAB66BE987',
      poolDataProvider: '0xFc21d6d146E6086B8359705C8b28512a983db0cb'
    },
    apy: 5.45,
    tvl: '$892.5M',
    riskLevel: 'Low',
    features: {
      autoCompound: true,
      lockupPeriod: false,
      instantWithdraw: true
    }
  }
]

/**
 * Get protocol configs for a specific chain
 */
export function getProtocolsByChain(chainId: number): ProtocolConfig[] {
  return PROTOCOL_CONFIGS.filter(config => config.chainId === chainId)
}

/**
 * Get specific protocol config
 */
export function getProtocolConfig(protocolId: string, chainId: number): ProtocolConfig | undefined {
  return PROTOCOL_CONFIGS.find(
    config => config.protocol.id === protocolId && config.chainId === chainId
  )
}

/**
 * Get best APY protocol for a chain
 */
export function getBestAPYProtocol(chainId: number): ProtocolConfig | undefined {
  const protocols = getProtocolsByChain(chainId)
  if (protocols.length === 0) return undefined
  return protocols.reduce((best, current) => (current.apy > best.apy ? current : best))
}
