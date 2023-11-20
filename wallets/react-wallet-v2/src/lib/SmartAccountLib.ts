import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import type { WalletClient } from 'viem'
import {
  publicClient,
  bundlerClient,
  pimlicoBundlerTransport,
  walletConnectTransport
} from './PimlicoLib'

// Create smart account
export async function createSmartAccount(signerPrivateKey: `0x${string}`) {
  const smartAccount = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey: signerPrivateKey,
    safeVersion: '1.4.1',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  })

  const smartAccountViemClient = createSmartAccountClient({
    account: smartAccount,
    chain: sepolia,
    transport: pimlicoBundlerTransport
  })

  const bytecode = await publicClient.getBytecode({ address: smartAccount.address })

  return {
    smartAccount,
    smartAccountViemClient,
    isDeployed: Boolean(bytecode)
  }
}

// Prrefund smart account
export async function prefundSmartAccount(
  signerPrivateKey: `0x${string}`,
  smartAccountViemClient: WalletClient
) {
  const signerAccount = privateKeyToAccount(signerPrivateKey)
  const signerAccountViemClient = createWalletClient({
    account: signerAccount,
    chain: sepolia,
    transport: walletConnectTransport
  })

  // prepareUserOperationRequest(smartAccountViemClient, {

  // })

  // TODO: Calculate prefund amount
  // const { maxFeePerGas, preVerificationGas, verificationGasLimit, callGasLimit } =
  //   smartAccountClient.userOp
  // const prefundAmount =
  //   maxFeePerGas * (preVerificationGas + 3 * verificationGasLimit + callGasLimit)

  // Prefund smart account
  const { fast } = await bundlerClient.getUserOperationGasPrice()
  const hash = await signerAccountViemClient.sendTransaction({
    to: smartAccountViemClient.account.address,
    value: 0n,
    maxFeePerGas: fast.maxFeePerGas,
    maxPriorityFeePerGas: fast.maxPriorityFeePerGas
  })
  await publicClient.waitForTransactionReceipt({ hash })

  return hash
}

export async function sendTestTransaction(smartAccountViemClient) {
  // Send test transaction to vitalik
  const { fast } = await bundlerClient.getUserOperationGasPrice()
  const hash = await smartAccountViemClient.sendTransaction({
    to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    value: 0n,
    maxFeePerGas: fast.maxFeePerGas,
    maxPriorityFeePerGas: fast.maxPriorityFeePerGas
  })

  return hash
}
