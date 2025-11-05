/**
 * Spark Protocol Integration Library
 * Spark is a fork of Aave V3, so it uses the same interface
 */

import { ethers, providers, BigNumber } from 'ethers'

// Spark uses the same ABI as Aave V3
const SPARK_POOL_ABI = [
  'function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowRate, uint128 stableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt)',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
  'function withdraw(address asset, uint256 amount, address to) external returns (uint256)'
]

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
]

const SPTOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function scaledBalanceOf(address user) view returns (uint256)'
]

export interface SparkReserveData {
  liquidityRate: string
  spTokenAddress: string // Spark's version of aToken
  availableLiquidity: string
  totalSupply: string
}

export interface SparkUserPosition {
  supplied: string
  suppliedUSD: string
  apy: number
}

export class SparkLib {
  private provider: providers.Provider
  private poolContract: ethers.Contract
  private chainId: number

  constructor(providerUrl: string, poolAddress: string, chainId: number) {
    this.provider = new providers.JsonRpcProvider(providerUrl)
    this.poolContract = new ethers.Contract(poolAddress, SPARK_POOL_ABI, this.provider)
    this.chainId = chainId
  }

  /**
   * Get reserve data for a specific asset
   */
  async getReserveData(tokenAddress: string): Promise<SparkReserveData> {
    try {
      const data = await this.poolContract.getReserveData(tokenAddress)

      const liquidityRate = data.currentLiquidityRate
      const apy = this.rayToAPY(liquidityRate)

      return {
        liquidityRate: liquidityRate.toString(),
        spTokenAddress: data.aTokenAddress, // Spark uses same structure
        availableLiquidity: '0',
        totalSupply: '0'
      }
    } catch (error) {
      console.error('Error fetching Spark reserve data:', error)
      throw error
    }
  }

  /**
   * Get user's position
   */
  async getUserPosition(
    userAddress: string,
    tokenAddress: string,
    tokenDecimals: number = 6
  ): Promise<SparkUserPosition> {
    try {
      const reserveData = await this.getReserveData(tokenAddress)
      const spTokenContract = new ethers.Contract(
        reserveData.spTokenAddress,
        SPTOKEN_ABI,
        this.provider
      )

      const balance = await spTokenContract.balanceOf(userAddress)
      const supplied = ethers.utils.formatUnits(balance, tokenDecimals)
      const suppliedUSD = supplied

      const apy = this.rayToAPY(BigNumber.from(reserveData.liquidityRate))

      return {
        supplied,
        suppliedUSD,
        apy
      }
    } catch (error) {
      console.error('Error fetching Spark user position:', error)
      throw error
    }
  }

  /**
   * Get token balance
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
   * Check allowance
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
   * Build approve transaction
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
   * Build supply transaction
   */
  buildSupplyTransaction(
    tokenAddress: string,
    amount: string,
    onBehalfOf: string,
    decimals: number = 6
  ) {
    const amountBN = ethers.utils.parseUnits(amount, decimals)
    const referralCode = 0

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
   * Build withdraw transaction
   */
  buildWithdrawTransaction(tokenAddress: string, amount: string, to: string, decimals: number = 6) {
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
   * Convert Ray rate to APY
   */
  private rayToAPY(liquidityRate: BigNumber): number {
    try {
      const RAY = BigNumber.from(10).pow(27)
      const SECONDS_PER_YEAR = 31536000

      const ratePerSecond = liquidityRate.div(RAY)
      const approximateAPY = (ratePerSecond.mul(SECONDS_PER_YEAR).toNumber() / 1e25) * 100

      return approximateAPY
    } catch (error) {
      console.error('Error converting ray to APY:', error)
      return 0
    }
  }

  /**
   * Estimate gas
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

export default SparkLib
