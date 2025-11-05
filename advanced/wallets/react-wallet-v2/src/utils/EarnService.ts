/**
 * Earn Service - Orchestrates interactions with lending protocols
 * Provides a unified interface for Aave and Spark protocols
 */

import AaveLib from '@/lib/AaveLib'
import SparkLib from '@/lib/SparkLib'
import { ProtocolConfig, UserPosition, DepositQuote, WithdrawQuote } from '@/types/earn'
import { PROTOCOL_CONFIGS, EARN_CHAINS } from '@/data/EarnProtocolsData'

// Cache for protocol instances
const protocolInstances: {
  aave: Map<number, AaveLib>
  spark: Map<number, SparkLib>
} = {
  aave: new Map(),
  spark: new Map()
}

/**
 * Get Aave instance for a specific chain
 */
function getAaveInstance(chainId: number): AaveLib | null {
  if (protocolInstances.aave.has(chainId)) {
    return protocolInstances.aave.get(chainId)!
  }

  const config = PROTOCOL_CONFIGS.find(c => c.protocol.id === 'aave' && c.chainId === chainId)
  if (!config) return null

  const rpcUrl = Object.values(EARN_CHAINS).find(c => c.id === chainId)?.rpc
  if (!rpcUrl) return null

  const instance = new AaveLib(rpcUrl, config.contracts.pool, chainId)
  protocolInstances.aave.set(chainId, instance)
  return instance
}

/**
 * Get Spark instance for a specific chain
 */
function getSparkInstance(chainId: number): SparkLib | null {
  if (protocolInstances.spark.has(chainId)) {
    return protocolInstances.spark.get(chainId)!
  }

  const config = PROTOCOL_CONFIGS.find(c => c.protocol.id === 'spark' && c.chainId === chainId)
  if (!config) return null

  const rpcUrl = Object.values(EARN_CHAINS).find(c => c.id === chainId)?.rpc
  if (!rpcUrl) return null

  const instance = new SparkLib(rpcUrl, config.contracts.pool, chainId)
  protocolInstances.spark.set(chainId, instance)
  return instance
}

/**
 * Fetch live APY for a protocol
 */
export async function fetchProtocolAPY(config: ProtocolConfig): Promise<number> {
  try {
    // For now, use the configured APY value
    // In production, we would fetch real-time data from the blockchain
    // The rayToAPY method is private and requires BigNumber conversion

    // TODO: Implement real-time APY fetching once contract integration is tested
    return config.apy
  } catch (error) {
    console.error(`Error fetching APY for ${config.protocol.name}:`, error)
    return config.apy // Fallback to config value
  }
}

/**
 * Fetch all protocol APYs
 */
export async function fetchAllProtocolAPYs(chainId: number): Promise<Map<string, number>> {
  const configs = PROTOCOL_CONFIGS.filter(c => c.chainId === chainId)
  const apyMap = new Map<string, number>()

  const promises = configs.map(async config => {
    const apy = await fetchProtocolAPY(config)
    apyMap.set(`${config.protocol.id}-${config.chainId}`, apy)
  })

  await Promise.allSettled(promises)
  return apyMap
}

/**
 * Get user's token balance
 */
export async function getUserTokenBalance(
  config: ProtocolConfig,
  userAddress: string
): Promise<string> {
  try {
    // TODO: Re-enable once correct contract addresses are verified
    // For now, return mock balance to avoid contract errors
    console.log(`Using mock balance for ${config.protocol.name} - contract integration pending`)
    return '5000' // Mock balance

    /* Disabled until contract addresses are verified
    if (config.protocol.id === 'aave') {
      const aave = getAaveInstance(config.chainId)
      if (!aave) return '0'
      return await aave.getTokenBalance(config.token.address, userAddress)
    } else if (config.protocol.id === 'spark') {
      const spark = getSparkInstance(config.chainId)
      if (!spark) return '0'
      return await spark.getTokenBalance(config.token.address, userAddress)
    }
    return '0'
    */
  } catch (error) {
    console.error('Error fetching token balance:', error)
    return '0'
  }
}

/**
 * Get user's position in a protocol
 */
export async function getUserProtocolPosition(
  config: ProtocolConfig,
  userAddress: string
): Promise<UserPosition | null> {
  try {
    // TODO: Re-enable once correct contract addresses are verified
    // For now, return null to avoid contract errors
    // The contract addresses need to be verified on Base chain

    console.log(
      `Skipping position fetch for ${config.protocol.name} on chain ${config.chainId} - contract integration pending`
    )
    return null

    /* Disabled until contract addresses are verified
    if (config.protocol.id === 'aave') {
      const aave = getAaveInstance(config.chainId)
      if (!aave) return null

      const position = await aave.getUserPosition(
        userAddress,
        config.token.address,
        config.token.decimals
      )

      // Only return if user has a balance
      if (parseFloat(position.supplied) === 0) return null

      // Calculate rewards (mock for now - real rewards need more complex calculation)
      const daysDeposited = 30 // Mock
      const dailyRate = position.apy / 365 / 100
      const rewards = (parseFloat(position.supplied) * dailyRate * daysDeposited).toFixed(6)
      const total = (parseFloat(position.supplied) + parseFloat(rewards)).toFixed(6)

      return {
        protocol: config.protocol.id,
        chainId: config.chainId,
        token: config.token.symbol,
        principal: position.supplied,
        principalUSD: position.suppliedUSD,
        rewards,
        rewardsUSD: rewards, // 1:1 for stablecoins
        total,
        totalUSD: total,
        apy: position.apy,
        depositedAt: Date.now() - daysDeposited * 24 * 60 * 60 * 1000, // Mock
        lastUpdateAt: Date.now()
      }
    } else if (config.protocol.id === 'spark') {
      const spark = getSparkInstance(config.chainId)
      if (!spark) return null

      const position = await spark.getUserPosition(
        userAddress,
        config.token.address,
        config.token.decimals
      )

      if (parseFloat(position.supplied) === 0) return null

      const daysDeposited = 30
      const dailyRate = position.apy / 365 / 100
      const rewards = (parseFloat(position.supplied) * dailyRate * daysDeposited).toFixed(6)
      const total = (parseFloat(position.supplied) + parseFloat(rewards)).toFixed(6)

      return {
        protocol: config.protocol.id,
        chainId: config.chainId,
        token: config.token.symbol,
        principal: position.supplied,
        principalUSD: position.suppliedUSD,
        rewards,
        rewardsUSD: rewards,
        total,
        totalUSD: total,
        apy: position.apy,
        depositedAt: Date.now() - daysDeposited * 24 * 60 * 60 * 1000,
        lastUpdateAt: Date.now()
      }
    }

    return null
    */
  } catch (error) {
    console.error('Error fetching user position:', error)
    return null
  }
}

/**
 * Get all user positions across protocols
 */
export async function getAllUserPositions(
  userAddress: string,
  chainId?: number
): Promise<UserPosition[]> {
  const configs = chainId ? PROTOCOL_CONFIGS.filter(c => c.chainId === chainId) : PROTOCOL_CONFIGS

  const positions: UserPosition[] = []

  const promises = configs.map(async config => {
    const position = await getUserProtocolPosition(config, userAddress)
    if (position) {
      positions.push(position)
    }
  })

  await Promise.allSettled(promises)
  return positions
}

/**
 * Check if approval is needed
 */
export async function checkApprovalNeeded(
  config: ProtocolConfig,
  userAddress: string,
  amount: string
): Promise<boolean> {
  try {
    if (config.protocol.id === 'aave') {
      const aave = getAaveInstance(config.chainId)
      if (!aave) return true

      const allowance = await aave.checkAllowance(
        config.token.address,
        userAddress,
        config.contracts.pool
      )
      return parseFloat(allowance) < parseFloat(amount)
    } else if (config.protocol.id === 'spark') {
      const spark = getSparkInstance(config.chainId)
      if (!spark) return true

      const allowance = await spark.checkAllowance(
        config.token.address,
        userAddress,
        config.contracts.pool
      )
      return parseFloat(allowance) < parseFloat(amount)
    }
    return true
  } catch (error) {
    console.error('Error checking approval:', error)
    return true
  }
}

/**
 * Get deposit quote with estimated rewards
 */
export async function getDepositQuote(
  config: ProtocolConfig,
  userAddress: string,
  amount: string
): Promise<DepositQuote> {
  const apy = await fetchProtocolAPY(config)
  const requiresApproval = await checkApprovalNeeded(config, userAddress, amount)

  const amountNum = parseFloat(amount)
  const apyDecimal = apy / 100

  return {
    protocol: config.protocol.id,
    chainId: config.chainId,
    amount,
    estimatedAPY: apy,
    estimatedYearlyRewards: (amountNum * apyDecimal).toFixed(6),
    estimatedMonthlyRewards: ((amountNum * apyDecimal) / 12).toFixed(6),
    estimatedDailyRewards: ((amountNum * apyDecimal) / 365).toFixed(6),
    requiresApproval
  }
}

/**
 * Get withdrawal quote
 */
export async function getWithdrawQuote(
  config: ProtocolConfig,
  position: UserPosition
): Promise<WithdrawQuote> {
  return {
    protocol: config.protocol.id,
    chainId: config.chainId,
    amount: position.total,
    principal: position.principal,
    rewards: position.rewards,
    total: position.total
  }
}

/**
 * Build approval transaction
 */
export function buildApprovalTransaction(config: ProtocolConfig, amount: string) {
  if (config.protocol.id === 'aave') {
    const aave = getAaveInstance(config.chainId)
    if (!aave) throw new Error('Aave instance not available')
    return aave.buildApproveTransaction(
      config.token.address,
      config.contracts.pool,
      amount,
      config.token.decimals
    )
  } else if (config.protocol.id === 'spark') {
    const spark = getSparkInstance(config.chainId)
    if (!spark) throw new Error('Spark instance not available')
    return spark.buildApproveTransaction(
      config.token.address,
      config.contracts.pool,
      amount,
      config.token.decimals
    )
  }
  throw new Error('Unknown protocol')
}

/**
 * Build deposit transaction
 */
export function buildDepositTransaction(
  config: ProtocolConfig,
  amount: string,
  userAddress: string
) {
  if (config.protocol.id === 'aave') {
    const aave = getAaveInstance(config.chainId)
    if (!aave) throw new Error('Aave instance not available')
    return aave.buildSupplyTransaction(
      config.token.address,
      amount,
      userAddress,
      config.token.decimals
    )
  } else if (config.protocol.id === 'spark') {
    const spark = getSparkInstance(config.chainId)
    if (!spark) throw new Error('Spark instance not available')
    return spark.buildSupplyTransaction(
      config.token.address,
      amount,
      userAddress,
      config.token.decimals
    )
  }
  throw new Error('Unknown protocol')
}

/**
 * Build withdrawal transaction
 */
export function buildWithdrawTransaction(
  config: ProtocolConfig,
  amount: string,
  userAddress: string
) {
  if (config.protocol.id === 'aave') {
    const aave = getAaveInstance(config.chainId)
    if (!aave) throw new Error('Aave instance not available')
    return aave.buildWithdrawTransaction(
      config.token.address,
      amount === 'all' ? 'max' : amount,
      userAddress,
      config.token.decimals
    )
  } else if (config.protocol.id === 'spark') {
    const spark = getSparkInstance(config.chainId)
    if (!spark) throw new Error('Spark instance not available')
    return spark.buildWithdrawTransaction(
      config.token.address,
      amount === 'all' ? 'max' : amount,
      userAddress,
      config.token.decimals
    )
  }
  throw new Error('Unknown protocol')
}

export default {
  fetchProtocolAPY,
  fetchAllProtocolAPYs,
  getUserTokenBalance,
  getUserProtocolPosition,
  getAllUserPositions,
  checkApprovalNeeded,
  getDepositQuote,
  getWithdrawQuote,
  buildApprovalTransaction,
  buildDepositTransaction,
  buildWithdrawTransaction
}
