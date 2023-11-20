import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import {
  publicClient,
  bundlerClient,
  pimlicoBundlerTransport,
  walletConnectTransport
} from './PimlicoLib'

// Create smart account
export async function createSmartAccount(privateKey) {
  const account = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey,
    safeVersion: '1.4.1',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  })

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    transport: pimlicoBundlerTransport
  })

  // publicClient.getBytecode({ address: account.address})

  return smartAccountClient
}

// Prrefund smart account
export async function prefundSmartAccount(signerAccountPrivateKey, smartAccountClient) {
  const signerAccount = privateKeyToAccount(signerAccountPrivateKey)
  const signerAccountClient = createWalletClient({
    account: signerAccount,
    chain: sepolia,
    transport: walletConnectTransport
  })

  // TODO: Calculate prefund amount
  // const { maxFeePerGas, preVerificationGas, verificationGasLimit, callGasLimit } =
  //   smartAccountClient.userOp
  // const prefundAmount =
  //   maxFeePerGas * (preVerificationGas + 3 * verificationGasLimit + callGasLimit)

  // Prefund smart account
  const hash = await signerAccountClient.sendTransaction({
    account: signerAccount,
    to: smartAccountClient.account.address,
    value: 100000000000000000n
  })
  await publicClient.waitForTransactionReceipt({ hash })

  return hash
}

export async function sendTestTransaction(smartAccount) {
  // Send test transaction to vitalik
  const gasPrices = await bundlerClient.getUserOperationGasPrice()
  const txHash = await smartAccount.sendTransaction({
    to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    value: 0n,
    data: '0x1234',
    maxFeePerGas: gasPrices.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas
  })

  return txHash
}
