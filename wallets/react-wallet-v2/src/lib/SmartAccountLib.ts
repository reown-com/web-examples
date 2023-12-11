import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import { goerli } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, etherUnits, formatEther } from 'viem'
import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'
import { createPublicClient, http } from 'viem'

// -- Helpers --------------------------------------------------------------------------------------
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_KEY

// -- RPC CLient -----------------------------------------------------------------------------------
export const pimlicoBundlerTransport = http(
  `https://api.pimlico.io/v1/goerli/rpc?apikey=${pimlicoKey}`,
  { retryDelay: 1000 }
)

export const walletConnectTransport = http(
  `https://rpc.walletconnect.com/v1/?chainId=EIP155:5&projectId=${projectId}`,
  { retryDelay: 1000 }
)

export const publicClient = createPublicClient({
  chain: goerli,
  transport: walletConnectTransport
})

export const bundlerClient = createPimlicoBundlerClient({
  chain: goerli,
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
    chain: goerli,
    transport: pimlicoBundlerTransport
  })
  console.log(`Created Smart Account ${smartAccount.address}`)

  // Step 2: Check if smart account is deployed
  const bytecode = await publicClient.getBytecode({ address: smartAccount.address })
  console.log(`Smart Account Bytecode: ${bytecode}`)
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
          chain: goerli,
          transport: walletConnectTransport
        })

        // Step 3.2: Precalculate necessary prefund amount
        // const data = await bundlerClient.getUserOperationGasPrice()
        // const userOpe = await smartAccountViemClient.prepareUserOperationRequest()

        // prepareUserOperationRequest(smartAccountViemClient, {
        // })

        // const { maxFeePerGas, preVerificationGas, verificationGasLimit, callGasLimit } =
        //   smartAccountClient.userOp
        // const prefundAmount =
        //   maxFeePerGas * (preVerificationGas + 3 * verificationGasLimit + callGasLimit)

        // Step 3.3: Send prefund transaction from signer to smart account if empty
        const smartAccountBalance = await publicClient.getBalance({
          address: smartAccountViemClient.account.address
        })
        console.log(`Smart Account Balance: ${formatEther(smartAccountBalance)} ETH`)
        if (smartAccountBalance < 1n) {
          console.log(`Smart Account has no balance. Starting prefund`)
          const { fast: fastPrefund } = await bundlerClient.getUserOperationGasPrice()
          const prefundHash = await signerAccountViemClient.sendTransaction({
            to: smartAccountViemClient.account.address,
            value: 10000000000000000n,
            maxFeePerGas: fastPrefund.maxFeePerGas,
            maxPriorityFeePerGas: fastPrefund.maxPriorityFeePerGas
          })
          console.log(`Prefunding Smart Account: ${prefundHash}`)
          await publicClient.waitForTransactionReceipt({ hash: prefundHash })
          console.log(`Prefunding Success`)
          const newSmartAccountBalance = await publicClient.getBalance({
            address: smartAccountViemClient.account.address
          })
          console.log(
            `Smart Account Balance: ${formatEther(newSmartAccountBalance)} ETH`
          )
        }

        // Step 4: Send test tx to Vitalik and create account
        const { fast: testGas, } = await bundlerClient.getUserOperationGasPrice()
        const transaction = {
          to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as `0x${string}`,
          value: 0n,
          maxFeePerGas: testGas.maxFeePerGas,
          maxPriorityFeePerGas: testGas.maxPriorityFeePerGas,
          
        };

        // console.log(`Sending first tx with gas: maxFeePerGas: ${formatEther(testGas.maxFeePerGas)} maxPriorityFeePerGas: ${formatEther(testGas.maxPriorityFeePerGas)}`)
        const testHash = await smartAccountViemClient.sendTransaction(transaction)
        console.log(`Sending first tx: ${JSON.stringify(testHash, null, 2)}`)
        await publicClient.waitForTransactionReceipt({ hash: testHash })
        console.log(`Account Created`)
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
