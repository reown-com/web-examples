/**
 * Earn Service - Orchestrates interactions with lending protocols
 * Provides a unified interface for Aave and Spark protocols
 */

import AaveLib from '@/lib/AaveLib'
import SparkLib from '@/lib/SparkLib'
import { ProtocolConfig, UserPosition, DepositQuote, WithdrawQuote } from '@/types/earn'
import { PROTOCOL_CONFIGS, EARN_CHAINS } from '@/data/EarnProtocolsData'
import { BigNumber } from 'ethers'

// Cache for protocol instances
const protocolInstances: {
  aave: Map<number, AaveLib>
  spark: Map<number, SparkLib>
} = {
  aave: new Map(),
  spark: new Map()
}

// APY Cache with timestamps
const apyCache: Map<string, { apy: number; timestamp: number }> = new Map()
const APY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds

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
  const cacheKey = `${config.protocol.id}-${config.chainId}`

  // Check cache first
  const cached = apyCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < APY_CACHE_DURATION) {
    console.log(
      `Using cached APY for ${config.protocol.name} (${Math.floor(
        (Date.now() - cached.timestamp) / 1000
      )}s old)`
    )
    return cached.apy
  }

  try {
    let protocolLib: AaveLib | SparkLib | null = null

    if (config.protocol.id === 'aave') {
      protocolLib = getAaveInstance(config.chainId)
    } else if (config.protocol.id === 'spark') {
      protocolLib = getSparkInstance(config.chainId)
    }

    if (!protocolLib) {
      console.warn(`No protocol instance for ${config.protocol.id} on chain ${config.chainId}`)
      return config.apy // Fallback to configured value
    }

    console.log(`Fetching live APY for ${config.protocol.name} on chain ${config.chainId}...`)

    // Fetch reserve data to get current APY
    const reserveData = await protocolLib.getReserveData(config.token.address)

    let apy = config.apy // Default fallback

    if (reserveData.liquidityRate && reserveData.liquidityRate !== '0') {
      try {
        // liquidityRate from Aave is the APR in Ray units (1e27)
        // Not a per-second rate - it's already annualized!
        const liquidityRateBN = BigNumber.from(reserveData.liquidityRate)

        // Convert from Ray to decimal APR
        // APR = liquidityRate / 1e27
        const { formatUnits } = require('ethers/lib/utils')
        const depositApr = parseFloat(formatUnits(liquidityRateBN, 27))

        // Convert APR to APY accounting for daily compounding
        // APY = (1 + APR/365)^365 - 1
        const depositApy = Math.pow(1 + depositApr / 365, 365) - 1

        // Convert to percentage
        apy = depositApy * 100

        console.log(`Raw liquidityRate: ${reserveData.liquidityRate}`)
        console.log(`Deposit APR (decimal): ${depositApr}`)
        console.log(`Deposit APR (%): ${(depositApr * 100).toFixed(4)}%`)
        console.log(`Deposit APY (%): ${apy.toFixed(4)}%`)
      } catch (conversionError) {
        console.warn('Error converting liquidityRate to APY:', conversionError)
        apy = config.apy
      }
    }

    // Cache the result
    apyCache.set(cacheKey, { apy, timestamp: Date.now() })
    console.log(`✓ Fetched APY for ${config.protocol.name}: ${apy.toFixed(2)}%`)

    return apy
  } catch (error: any) {
    // Handle rate limiting and other errors gracefully
    if (error.code === 'CALL_EXCEPTION') {
      console.warn(
        `Contract call failed for ${config.protocol.name} on chain ${config.chainId} - using fallback APY`
      )
    } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      console.warn(
        `Rate limited when fetching APY for ${config.protocol.name} - using fallback APY`
      )
    } else {
      console.error(`Error fetching APY for ${config.protocol.name}:`, error)
    }
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
    let protocolLib: AaveLib | SparkLib | null = null

    if (config.protocol.id === 'aave') {
      protocolLib = getAaveInstance(config.chainId)
    } else if (config.protocol.id === 'spark') {
      protocolLib = getSparkInstance(config.chainId)
    }

    if (!protocolLib) {
      console.warn(`No protocol instance for ${config.protocol.id}`)
      return '0'
    }

    return await protocolLib.getTokenBalance(config.token.address, userAddress)
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
    let protocolLib: AaveLib | SparkLib | null = null

    if (config.protocol.id === 'aave') {
      protocolLib = getAaveInstance(config.chainId)
    } else if (config.protocol.id === 'spark') {
      protocolLib = getSparkInstance(config.chainId)
    }

    if (!protocolLib) {
      console.warn(`No protocol instance for ${config.protocol.id}`)
      return null
    }

    const position = await protocolLib.getUserPosition(
      userAddress,
      config.token.address,
      config.token.decimals
    )

    // Only return if user has a balance
    if (parseFloat(position.supplied) === 0) return null

    // Use the APY from the cache if available, otherwise use the position's APY
    const { default: EarnStore } = await import('@/store/EarnStore')
    const cachedAPY = EarnStore.getAPY(config.protocol.id, config.chainId)
    const apy = cachedAPY || position.apy || config.apy

    // In Aave, the aToken balance (position.supplied) already includes accrued interest
    // We'll estimate the original principal based on a 30-day deposit assumption
    // This is a rough estimate - in production, you'd track the actual deposit amount
    const daysDeposited = 30 // Mock estimate
    const totalWithInterest = parseFloat(position.supplied)
    const estimatedPrincipal = totalWithInterest / (1 + (apy / 100 / 365) * daysDeposited)
    const estimatedRewards = totalWithInterest - estimatedPrincipal

    return {
      protocol: config.protocol.id,
      chainId: config.chainId,
      token: config.token.symbol,
      principal: estimatedPrincipal.toFixed(6),
      principalUSD: estimatedPrincipal.toFixed(6),
      rewards: estimatedRewards.toFixed(6),
      rewardsUSD: estimatedRewards.toFixed(6), // 1:1 for stablecoins
      total: position.supplied, // This is the actual withdrawable amount
      totalUSD: position.supplied,
      apy: apy,
      depositedAt: Date.now() - daysDeposited * 24 * 60 * 60 * 1000, // Mock
      lastUpdateAt: Date.now()
    }
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

  // Fetch positions sequentially to avoid rate limiting
  for (const config of configs) {
    try {
      const position = await getUserProtocolPosition(config, userAddress)
      if (position) {
        positions.push(position)
      }
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Error fetching position for ${config.protocol.name}:`, error)
      // Continue with next protocol even if one fails
    }
  }

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
