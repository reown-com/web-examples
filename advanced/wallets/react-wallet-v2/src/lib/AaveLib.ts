/**
 * Aave V3 Protocol Integration Library
 * Handles all interactions with Aave V3 contracts
 */

import { ethers, providers, BigNumber } from 'ethers'

// Aave V3 Pool ABI - minimal interface for deposit/withdraw/supply operations
const AAVE_POOL_ABI = [
  // Read methods
  'function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowRate, uint128 stableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt)',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',

  // Write methods
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
  'function withdraw(address asset, uint256 amount, address to) external returns (uint256)'
]

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
]

// aToken ABI for reading deposited balance
const ATOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function scaledBalanceOf(address user) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
]

export interface AaveReserveData {
  liquidityRate: string // APY in ray units (27 decimals)
  aTokenAddress: string
  availableLiquidity: string
  totalSupply: string
}

export interface AaveUserPosition {
  supplied: string // Amount supplied (in token units)
  suppliedUSD: string
  apy: number
}

export class AaveLib {
  private provider: providers.Provider
  private poolContract: ethers.Contract
  private chainId: number

  constructor(providerUrl: string, poolAddress: string, chainId: number) {
    this.provider = new providers.JsonRpcProvider(providerUrl)
    this.poolContract = new ethers.Contract(poolAddress, AAVE_POOL_ABI, this.provider)
    this.chainId = chainId
  }

  /**
   * Get reserve data for a specific asset (e.g., USDC)
   */
  async getReserveData(tokenAddress: string): Promise<AaveReserveData> {
    try {
      const data = await this.poolContract.getReserveData(tokenAddress)

      console.log('Raw reserve data array length:', data.length)
      console.log('aTokenAddress from data[8]:', data[8])

      // currentLiquidityRate is in Ray units (1e27)
      // The aToken address is at index 8, not 7
      const liquidityRate = data.currentLiquidityRate || data[2]
      const aTokenAddress = data[8] // Correct index for aToken address
      const apy = this.rayToAPY(liquidityRate)

      return {
        liquidityRate: liquidityRate.toString(),
        aTokenAddress: aTokenAddress,
        availableLiquidity: '0', // Would need additional call to get this
        totalSupply: '0' // Would need additional call to get this
      }
    } catch (error) {
      console.error('Error fetching Aave reserve data:', error)
      throw error
    }
  }

  /**
   * Get user's position (supplied amount and APY)
   */
  async getUserPosition(
    userAddress: string,
    tokenAddress: string,
    tokenDecimals: number = 6
  ): Promise<AaveUserPosition> {
    try {
      console.log('Getting user position for:', { userAddress, tokenAddress })

      const reserveData = await this.getReserveData(tokenAddress)
      console.log('Reserve data aToken address:', reserveData.aTokenAddress)

      const aTokenContract = new ethers.Contract(
        reserveData.aTokenAddress,
        ATOKEN_ABI,
        this.provider
      )

      console.log('Calling balanceOf on aToken...')
      const balance = await aTokenContract.balanceOf(userAddress)
      console.log('Balance:', balance.toString())

      const supplied = ethers.utils.formatUnits(balance, tokenDecimals)

      // For mock, use 1 USDC = 1 USD
      const suppliedUSD = supplied

      const apy = this.rayToAPY(BigNumber.from(reserveData.liquidityRate))

      return {
        supplied,
        suppliedUSD,
        apy
      }
    } catch (error) {
      console.error('Error fetching Aave user position:', error)
      throw error
    }
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
      const balance = await tokenContract.balanceOf(userAddress)
      const decimals = await tokenContract.decimals()
      return ethers.utils.formatUnits(balance, decimals)
    } catch (error) {
      console.error('Error fetching token balance:', error)
      throw error
    }
  }

  /**
   * Get Total Value Locked (TVL) for a specific asset
   * TVL = total supply of aTokens (which represents all deposits)
   */
  async getTVL(tokenAddress: string, tokenDecimals: number = 6): Promise<string> {
    try {
      const reserveData = await this.getReserveData(tokenAddress)
      const aTokenContract = new ethers.Contract(
        reserveData.aTokenAddress,
        ATOKEN_ABI,
        this.provider
      )

      const totalSupply = await aTokenContract.totalSupply()
      const tvl = ethers.utils.formatUnits(totalSupply, tokenDecimals)

      return tvl
    } catch (error) {
      console.error('Error fetching TVL:', error)
      throw error
    }
  }

  /**
   * Check if user has approved spending
   */
  async checkAllowance(
    tokenAddress: string,
    userAddress: string,
    spenderAddress: string
  ): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
      const allowance = await tokenContract.allowance(userAddress, spenderAddress)
      const decimals = await tokenContract.decimals()
      return ethers.utils.formatUnits(allowance, decimals)
    } catch (error) {
      console.error('Error checking allowance:', error)
      throw error
    }
  }

  /**
   * Build approve transaction data
   */
  buildApproveTransaction(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    decimals: number = 6
  ) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI)
    const amountBN = ethers.utils.parseUnits(amount, decimals)

    return {
      to: tokenAddress,
      data: tokenContract.interface.encodeFunctionData('approve', [spenderAddress, amountBN]),
      value: '0x0'
    }
  }

  /**
   * Build supply (deposit) transaction data
   */
  buildSupplyTransaction(
    tokenAddress: string,
    amount: string,
    onBehalfOf: string,
    decimals: number = 6
  ) {
    const amountBN = ethers.utils.parseUnits(amount, decimals)
    const referralCode = 0 // No referral

    return {
      to: this.poolContract.address,
      data: this.poolContract.interface.encodeFunctionData('supply', [
        tokenAddress,
        amountBN,
        onBehalfOf,
        referralCode
      ]),
      value: '0x0'
    }
  }

  /**
   * Build withdraw transaction data
   */
  buildWithdrawTransaction(tokenAddress: string, amount: string, to: string, decimals: number = 6) {
    // Use max uint256 to withdraw all
    const amountBN =
      amount === 'max' ? ethers.constants.MaxUint256 : ethers.utils.parseUnits(amount, decimals)

    return {
      to: this.poolContract.address,
      data: this.poolContract.interface.encodeFunctionData('withdraw', [
        tokenAddress,
        amountBN,
        to
      ]),
      value: '0x0'
    }
  }

  /**
   * Convert Ray rate (1e27) to APY percentage
   * Formula: APY = (1 + rate/1e27)^(365*24*60*60) - 1
   * Simplified for small rates: APY ≈ rate / 1e27 * seconds_per_year / 1e27 * 100
   */
  private rayToAPY(liquidityRate: BigNumber): number {
    try {
      const RAY = BigNumber.from(10).pow(27)
      const SECONDS_PER_YEAR = 31536000

      // liquidityRate is per second in Ray
      // APY = ((1 + ratePerSecond)^secondsPerYear - 1) * 100
      // For small rates, approximate: APY ≈ ratePerSecond * secondsPerYear * 100

      const ratePerSecond = liquidityRate.div(RAY)
      const approximateAPY = (ratePerSecond.mul(SECONDS_PER_YEAR).toNumber() / 1e25) * 100

      return approximateAPY
    } catch (error) {
      console.error('Error converting ray to APY:', error)
      return 0
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: any, from: string): Promise<string> {
    try {
      const gasLimit = await this.provider.estimateGas({
        ...transaction,
        from
      })
      const gasPrice = await this.provider.getGasPrice()
      const gasCost = gasLimit.mul(gasPrice)
      return ethers.utils.formatEther(gasCost)
    } catch (error) {
      console.error('Error estimating gas:', error)
      return '0'
    }
  }
}

export default AaveLib
