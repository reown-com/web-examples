import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { Chain, createWalletClient, formatEther, createPublicClient, http } from 'viem'
import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'

// -- Helpers --------------------------------------------------------------------------------------
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
type SmartAccountEnabledChains = 'sepolia' | 'goerli'
// -- RPC CLient -----------------------------------------------------------------------------------

const getWalletConnectTransport = (chain: Chain) => {
  return http(
    `https://rpc.walletconnect.com/v1/?chainId=EIP155:${chain.id}&projectId=${projectId}`,
    { retryDelay: 1000 }
  )
}

const getPimlicoBundlerTransport = (chain: Chain) => {
  return http(
    `https://api.pimlico.io/v1/${chain.name.toLowerCase()}/rpc?apikey=${pimlicoKey}`,
    { retryDelay: 1000 }
  );
}

const createRPCClients = (chainName: SmartAccountEnabledChains) => {
  const chain = chains[chainName] as Chain
  const pimlicoBundlerTransport = getPimlicoBundlerTransport(chain)
  const walletConnectTransport = getWalletConnectTransport(chain)

  const publicClient = createPublicClient({
    chain: chain,
    transport: walletConnectTransport
  })

  const bundlerClient = createPimlicoBundlerClient({
    chain: chain,
    transport: pimlicoBundlerTransport
  })

  return {
    bundlerClient,
    publicClient,
  }
}



// -- CLients -----------------------------------------------------------------------------------
export const getSignerClient = (signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) => {
  const chain = chains[chainName] as Chain
  const signerAccount = privateKeyToAccount(signerPrivateKey)
  return createWalletClient({
    account: signerAccount,
    chain,
    transport: getWalletConnectTransport(chain)
  })
}

export const getSmartAccountClient = async (signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) => {
  const chain = chains[chainName] as Chain
  const { publicClient } = createRPCClients(chainName)

  const smartAccount = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey: signerPrivateKey,
    safeVersion: '1.4.1',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  })

  return createSmartAccountClient({
    account: smartAccount,
    chain,
    transport: getPimlicoBundlerTransport(chain)
  })
}

// -- Smart Account Utils -----------------------------------------------------------------------------------
export const prefundSmartAccount = async (address: `0x${string}`, signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) => {
  const { bundlerClient, publicClient } = createRPCClients(chainName)
  const signerAccountViemClient = getSignerClient(signerPrivateKey, chainName);
  const smartAccountBalance = await publicClient.getBalance({ address })

  console.log(`Smart Account Balance: ${formatEther(smartAccountBalance)} ETH`)
  if (smartAccountBalance < 1n) {
    console.log(`Smart Account has no balance. Starting prefund`)
    const { fast: fastPrefund } = await bundlerClient.getUserOperationGasPrice()
    const prefundHash = await signerAccountViemClient.sendTransaction({
      to: address,
      value: 10000000000000000n,
      maxFeePerGas: fastPrefund.maxFeePerGas,
      maxPriorityFeePerGas: fastPrefund.maxPriorityFeePerGas
    })

    await publicClient.waitForTransactionReceipt({ hash: prefundHash })
    console.log(`Prefunding Success`)

    const newSmartAccountBalance = await publicClient.getBalance({ address })
    console.log(
      `Smart Account Balance: ${formatEther(newSmartAccountBalance)} ETH`
    )
  }
}

// By default first transaction will deploy the smart contract if it hasn't been deployed yet
export const sendTestTransaction = async (signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) => {
  const { bundlerClient, publicClient } = createRPCClients(chainName)
  const smartAccountClient = await getSmartAccountClient(signerPrivateKey, chainName);
  const { fast: testGas, } = await bundlerClient.getUserOperationGasPrice()

  const testHash = await smartAccountClient.sendTransaction({
    to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as `0x${string}`,
    value: 0n,
    maxFeePerGas: testGas.maxFeePerGas,
    maxPriorityFeePerGas: testGas.maxPriorityFeePerGas,
  })

  await publicClient.waitForTransactionReceipt({ hash: testHash })
  console.log(`Test Transaction Success`)
}

export const checkIfSmartAccountDeployed = async (address: `0x${string}`, chainName: SmartAccountEnabledChains) => {
  const { publicClient } = createRPCClients(chainName)
  const bytecode = await publicClient.getBytecode({ address })
  return Boolean(bytecode)
}

export const deploySmartAccount = async (signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) => {
    const smartAccountClient = await getSmartAccountClient(signerPrivateKey, chainName);
    const isDeployed = await checkIfSmartAccountDeployed(smartAccountClient?.account.address, chainName)
    if (!isDeployed) {
    // If not deployed, prefund smart account from signer
      // Step 3: Send prefund transaction from signer to smart account if empty
      await prefundSmartAccount(smartAccountClient.account.address, signerPrivateKey, chainName)

      // Step 4: Create account by sending test tx
      await sendTestTransaction(signerPrivateKey, chainName)
      console.log(`Account Created`)
    }
  }

// -- Smart Account --------------------------------------------------------------------------------
export async function getSmartAccount(signerPrivateKey: `0x${string}`, chainName: SmartAccountEnabledChains) {
  // Step 1: Create smart account details and client
  const smartAccountClient = await getSmartAccountClient(signerPrivateKey, chainName); 
  console.log(`Created Smart Account ${smartAccountClient.account.address}`)

  // Step 2: Check if smart account is deployed
  const isDeployed = await checkIfSmartAccountDeployed(smartAccountClient.account.address, chainName)
  console.log(`Is Smart Account Deployed? ${isDeployed}`)

  return {
    smartAccountClient,
    isDeployed,
    deploySmartAccount,
  }
}