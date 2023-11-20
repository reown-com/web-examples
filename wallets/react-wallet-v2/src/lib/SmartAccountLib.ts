import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSimpleSmartAccount } from 'permissionless/accounts'
import { sepolia } from 'viem/chains'
import { bundlerClient, paymasterClient, publicClient, pimlicoBundlerTransport } from './PimlicoLib'

export async function createSmartAccount(privateKey: `0x${string}`) {
  const account = await privateKeyToSimpleSmartAccount(publicClient, {
    privateKey: '0xc923a9b1bc035ba964afab56200ac76d49e91a9548e0e4bf79f79754e072abba',
    factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454', // simple account factory
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' // global entrypoint
  })

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    transport: pimlicoBundlerTransport,
    sponsorUserOperation: paymasterClient.sponsorUserOperation
  })

  const gasPrices = await bundlerClient.getUserOperationGasPrice()

  const txHash = await smartAccountClient.sendTransaction({
    to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    value: 0n,
    data: '0x1234',
    maxFeePerGas: gasPrices.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas
  })
}
