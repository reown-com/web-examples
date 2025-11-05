/**
 * Earn Transaction Service
 * Handles sending transactions for deposit, approval, and withdrawal operations
 */

import { providers } from 'ethers'
import SettingsStore from '@/store/SettingsStore'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { getWallet } from '@/utils/EIP155WalletUtil'
import {
  buildApprovalTransaction,
  buildDepositTransaction,
  buildWithdrawTransaction
} from '@/utils/EarnService'
import { ProtocolConfig } from '@/types/earn'

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
    const wallet = await getWallet({ chainId })

    // Build the approval transaction
    const txData = buildApprovalTransaction(config, amount)

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    // Send transaction
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value
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
    const wallet = await getWallet({ chainId })

    // Build the deposit transaction
    const txData = buildDepositTransaction(config, amount, userAddress)

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    // Send transaction
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value
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
    const wallet = await getWallet({ chainId })

    // Build the withdrawal transaction
    const txData = buildWithdrawTransaction(config, amount, userAddress)

    // Get provider for the chain
    const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)

    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider)

    // Send transaction
    const tx = await connectedWallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value
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
