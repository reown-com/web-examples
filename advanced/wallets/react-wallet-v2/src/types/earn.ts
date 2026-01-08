/**
 * Types and interfaces for the Earn feature
 */

export type ProtocolType = 'aave' | 'spark'

export type RiskLevel = 'Low' | 'Medium' | 'High'

export type TransactionStatus =
  | 'idle'
  | 'approving'
  | 'depositing'
  | 'withdrawing'
  | 'success'
  | 'error'

export interface Protocol {
  id: ProtocolType
  name: string
  displayName: string
  logo: string
  description?: string
}

export interface ProtocolConfig {
  protocol: Protocol
  chainId: number
  chainName: string
  token: {
    symbol: string
    address: string
    decimals: number
    logo: string
  }
  contracts: {
    pool: string
    poolDataProvider?: string
    aToken?: string
    variableDebtToken?: string
  }
  apy: number // Annual Percentage Yield
  tvl: string // Total Value Locked (formatted string like "$125.4M")
  riskLevel: RiskLevel
  features?: {
    autoCompound: boolean
    lockupPeriod: boolean
    instantWithdraw: boolean
  }
}

export interface UserPosition {
  protocol: ProtocolType
  chainId: number
  token: string
  principal: string // Amount deposited (in token units)
  principalUSD: string // USD value of principal
  rewards: string // Accumulated rewards (in token units)
  rewardsUSD: string // USD value of rewards
  total: string // principal + rewards
  totalUSD: string // USD value of total
  apy: number // Current APY
  depositedAt: number // Timestamp
  lastUpdateAt: number // Timestamp
}

export interface DepositQuote {
  protocol: ProtocolType
  chainId: number
  amount: string
  estimatedAPY: number
  estimatedYearlyRewards: string
  estimatedMonthlyRewards: string
  estimatedDailyRewards: string
  gasEstimate?: string
  requiresApproval: boolean
}

export interface WithdrawQuote {
  protocol: ProtocolType
  chainId: number
  amount: string
  principal: string
  rewards: string
  total: string
  gasEstimate?: string
}

export interface TransactionState {
  status: TransactionStatus
  txHash?: string
  error?: string
  message?: string
}

export interface EarnFilters {
  minAPY?: number
  maxRisk?: RiskLevel
  chains?: number[]
  protocols?: ProtocolType[]
}
