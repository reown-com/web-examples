import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'
import { createPublicClient, http } from 'viem'

// -- Helpers --------------------------------------------------------------------------------------
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_KEY

// -- RPC CLient -----------------------------------------------------------------------------------
export const pimlicoBundlerTransport = http(
  `https://api.pimlico.io/v1/sepolia/rpc?apikey=${pimlicoKey}`
)

export const walletConnectTransport = http(
  `https://rpc.walletconnect.com/v1/?chainId=EIP155:11155111&projectId=${projectId}`
)

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: walletConnectTransport
})

export const bundlerClient = createPimlicoBundlerClient({
  chain: sepolia,
  transport: pimlicoBundlerTransport
})

// -- Smart Account --------------------------------------------------------------------------------
export async function getSmartAccount(signerPrivateKey: `0x${string}`) {
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

  return {
    smartAccountViemClient,
    isDeployed,
    deploy: async () => {
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
        const data = await bundlerClient.getUserOperationGasPrice()

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
          value: 50000000000000000n,
          maxFeePerGas: fast.maxFeePerGas,
          maxPriorityFeePerGas: fast.maxPriorityFeePerGas
        })
        console.log(`Prefunding Smart Account: ${prefundHash}`)
        await publicClient.waitForTransactionReceipt({ hash: prefundHash })
        console.log(`Prefunding Success`)
      }
    }
  }
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
