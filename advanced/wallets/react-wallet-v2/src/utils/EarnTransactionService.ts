/**
 * Earn Transaction Service
 * Handles sending transactions for deposit, approval, and withdrawal operations
 */

import { providers, utils } from 'ethers'
import SettingsStore from '@/store/SettingsStore'
import { getWallet } from '@/utils/EIP155WalletUtil'
import {
  buildApprovalTransaction,
  buildDepositTransaction,
  buildWithdrawTransaction
} from '@/utils/EarnService'
import { ProtocolConfig } from '@/types/earn'
import { EARN_CHAINS } from '@/data/EarnProtocolsData'

export interface TransactionResult {
  success: boolean
  txHash?: string
  error?: string
}

/**
 * Send approval transaction for ERC20 token
 */
export async function sendApprovalTransaction(
  config: ProtocolConfig,
  amount: string,
  userAddress: string
): Promise<TransactionResult> {
  try {
    const chainId = `eip155:${config.chainId}`
    const wallet = await getWallet({ chainId, address: userAddress })

    // Build the approval transaction
    const txData = buildApprovalTransaction(config, amount)

    // Get RPC URL for the chain from EARN_CHAINS
    const rpcUrl = Object.values(EARN_CHAINS).find(c => c.id === config.chainId)?.rpc
    if (!rpcUrl) {
      throw new Error(`No RPC URL found for chain ${config.chainId}`)
    }

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(rpcUrl)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    // Check ETH balance for gas
    const ethBalance = await provider.getBalance(userAddress)
    console.log('ETH Balance:', ethBalance.toString(), '(', utils.formatEther(ethBalance), 'ETH )')

    // Base network has very low gas fees - typically just a few cents
    // 0.0001 ETH (~$0.30) should be enough for multiple transactions
    const minBalance = utils.parseEther('0.0001')
    if (ethBalance.lt(minBalance)) {
      console.warn('Low ETH balance - may not have enough for gas fees')
      return {
        success: false,
        error: `Insufficient ETH for gas fees. Your balance: ${utils.formatEther(
          ethBalance
        )} ETH. Please add at least 0.0005 ETH (~$1.50) to cover transaction fees on Base network.`
      }
    }

    console.log('Sending approval transaction...', {
      to: txData.to,
      from: userAddress,
      data: txData.data
    })

    // Send transaction - let the wallet estimate gas automatically
    // Base uses EIP-1559, so we don't need to set gasPrice
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value || 0
      // No gasLimit or gasPrice - let ethers estimate for optimal fees
    })

    console.log(`Approval transaction sent: ${tx.hash}`)

    // Wait for confirmation
    const receipt = await tx.wait()

    console.log(`Approval transaction confirmed in block ${receipt.blockNumber}`)

    return {
      success: true,
      txHash: tx.hash
    }
  } catch (error: any) {
    console.error('Error sending approval transaction:', error)
    return {
      success: false,
      error: error.message || 'Transaction failed'
    }
  }
}

/**
 * Send deposit transaction
 */
export async function sendDepositTransaction(
  config: ProtocolConfig,
  amount: string,
  userAddress: string
): Promise<TransactionResult> {
  try {
    const chainId = `eip155:${config.chainId}`
    const wallet = await getWallet({ chainId, address: userAddress })

    // Build the deposit transaction
    const txData = buildDepositTransaction(config, amount, userAddress)

    // Get RPC URL for the chain from EARN_CHAINS
    const rpcUrl = Object.values(EARN_CHAINS).find(c => c.id === config.chainId)?.rpc
    if (!rpcUrl) {
      throw new Error(`No RPC URL found for chain ${config.chainId}`)
    }

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(rpcUrl)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    // Log transaction details
    console.log('Sending deposit transaction...', {
      to: txData.to,
      from: userAddress,
      data: txData.data,
      amount: amount,
      token: config.token.address
    })

    // Check USDC balance before deposit
    const tokenContract = new utils.Interface([
      'function balanceOf(address) view returns (uint256)'
    ])
    const balanceCallData = tokenContract.encodeFunctionData('balanceOf', [userAddress])

    try {
      const balanceResult = await provider.call({
        to: config.token.address,
        data: balanceCallData
      })
      const balance = utils.defaultAbiCoder.decode(['uint256'], balanceResult)[0]
      console.log('USDC Balance:', utils.formatUnits(balance, config.token.decimals))

      // Check if balance is sufficient
      const amountBN = utils.parseUnits(amount, config.token.decimals)
      if (balance.lt(amountBN)) {
        return {
          success: false,
          error: `Insufficient USDC balance. You have ${utils.formatUnits(
            balance,
            config.token.decimals
          )} USDC but trying to deposit ${amount} USDC.`
        }
      }
    } catch (balanceError) {
      console.warn('Could not check USDC balance:', balanceError)
    }

    // Send transaction - let the wallet estimate gas automatically
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value || 0
      // No gasLimit - let ethers estimate for optimal fees
    })

    console.log(`Deposit transaction sent: ${tx.hash}`)

    // Wait for confirmation
    const receipt = await tx.wait()

    console.log(`Deposit transaction confirmed in block ${receipt.blockNumber}`)

    return {
      success: true,
      txHash: tx.hash
    }
  } catch (error: any) {
    console.error('Error sending deposit transaction:', error)
    return {
      success: false,
      error: error.message || 'Transaction failed'
    }
  }
}

/**
 * Send withdrawal transaction
 */
export async function sendWithdrawTransaction(
  config: ProtocolConfig,
  amount: string,
  userAddress: string
): Promise<TransactionResult> {
  try {
    const chainId = `eip155:${config.chainId}`
    const wallet = await getWallet({ chainId, address: userAddress })

    // Build the withdrawal transaction
    const txData = buildWithdrawTransaction(config, amount, userAddress)

    // Get RPC URL for the chain from EARN_CHAINS
    const rpcUrl = Object.values(EARN_CHAINS).find(c => c.id === config.chainId)?.rpc
    if (!rpcUrl) {
      throw new Error(`No RPC URL found for chain ${config.chainId}`)
    }

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(rpcUrl)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    console.log('Sending withdrawal transaction...', {
      to: txData.to,
      from: userAddress,
      data: txData.data
    })

    // Send transaction - let the wallet estimate gas automatically
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value || 0
      // No gasLimit - let ethers estimate for optimal fees
    })

    console.log(`Withdrawal transaction sent: ${tx.hash}`)

    // Wait for confirmation
    const receipt = await tx.wait()

    console.log(`Withdrawal transaction confirmed in block ${receipt.blockNumber}`)

    return {
      success: true,
      txHash: tx.hash
    }
  } catch (error: any) {
    console.error('Error sending withdrawal transaction:', error)
    return {
      success: false,
      error: error.message || 'Transaction failed'
    }
  }
}

export default {
  sendApprovalTransaction,
  sendDepositTransaction,
  sendWithdrawTransaction
}
