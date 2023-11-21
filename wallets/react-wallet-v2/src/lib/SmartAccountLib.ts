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

export async function getOrCreateSmartAccount(signerPrivateKey: `0x${string}`) {
  // Step 1: Create smart account details and client
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
  console.log(`Created Smart Account ${smartAccount.address}`)

  // Step 2: Check if smart account is deployed
  const bytecode = await publicClient.getBytecode({ address: smartAccount.address })
  const isDeployed = Boolean(bytecode)
  console.log(`Is Smart Account Deployed? ${isDeployed}`)

  // Step 3: If not deployed, prefund smart account from signer
  if (!isDeployed) {
    // Step 3.1: Create signer account and client from private key
    const signerAccount = privateKeyToAccount(signerPrivateKey)
    const signerAccountViemClient = createWalletClient({
      account: signerAccount,
      chain: sepolia,
      transport: walletConnectTransport
    })

    // Step 3.2: Precalculate necessary prefund amount

    // prepareUserOperationRequest(smartAccountViemClient, {
    // })

    // const { maxFeePerGas, preVerificationGas, verificationGasLimit, callGasLimit } =
    //   smartAccountClient.userOp
    // const prefundAmount =
    //   maxFeePerGas * (preVerificationGas + 3 * verificationGasLimit + callGasLimit)

    // Step 3.3: Send prefund transaction from signer to smart account
    const { fast } = await bundlerClient.getUserOperationGasPrice()
    const prefundHash = await signerAccountViemClient.sendTransaction({
      to: smartAccountViemClient.account.address,
      value: 0n,
      maxFeePerGas: fast.maxFeePerGas,
      maxPriorityFeePerGas: fast.maxPriorityFeePerGas
    })
    console.log(`Prefunding Smart Account: ${prefundHash}`)
    await publicClient.waitForTransactionReceipt({ hash: prefundHash })
    console.log(`Prefunding Success`)
  }

  return { smartAccountViemClient }
}

// export async function sendTestTransaction(smartAccountViemClient: WalletClient) {
//   // Send test transaction to vitalik
//   const { fast } = await bundlerClient.getUserOperationGasPrice()
//   const hash = await smartAccountViemClient.sendTransaction({
//     to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
//     value: 0n,
//     maxFeePerGas: fast.maxFeePerGas,
//     maxPriorityFeePerGas: fast.maxPriorityFeePerGas
//   })

//   return hash
// }
