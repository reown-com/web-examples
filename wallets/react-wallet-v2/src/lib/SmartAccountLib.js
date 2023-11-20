import { createSmartAccountClient } from 'permissionless'
import { privateKeyToSafeSmartAccount } from 'permissionless/accounts'
import { sepolia } from 'viem/chains'
import { paymasterClient, publicClient, pimlicoBundlerTransport } from './PimlicoLib'

export async function createSmartAccount(privateKey) {
  const account = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey,
    safeVersion: '1.4.1',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  })

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    transport: pimlicoBundlerTransport,
    sponsorUserOperation: paymasterClient.sponsorUserOperation
  })

  return smartAccountClient
}
