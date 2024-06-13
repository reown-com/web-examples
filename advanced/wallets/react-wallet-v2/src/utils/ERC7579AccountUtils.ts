import { Address, Chain, createPublicClient, http } from 'viem'
import { smartAccountWallets } from './SmartAccountUtil'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { Module } from '@rhinestone/module-sdk'
const { getAccount, isModuleInstalled } =
  require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

function getSmartWallet(accountAddress: string, chainId: string) {
  const smartAccount = `${chainId}:${accountAddress}`
  const account = Object.keys(smartAccountWallets).find(sca => {
    return sca.toLowerCase() === smartAccount.toLowerCase()
  })
  if (account) {
    const lib = smartAccountWallets[account]
    if (lib) {
      return lib
    }
  }
}

export async function installERC7579Module(args: {
  accountAddress: string
  chainId: string
  moduleType: string
  moduleAddress: string
}) {
  const { accountAddress, chainId, moduleType, moduleAddress } = args
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
  console.log(smartContractWallet)
  console.log({ accountAddress, chainId, moduleType, moduleAddress })

  if (smartContractWallet instanceof SafeSmartAccountLib) {
    const txHash = await smartContractWallet.installModule({
      moduleAddress: moduleAddress as Address,
      moduleInitcode: '0x',
      moduleType: BigInt(moduleType)
    })
  }
}

export async function getPublicClient(chain: Chain) {
  return createPublicClient({
    transport: http(),
    chain: chain
  })
}

export async function isERC7579ModuleInstalled(
  address: Address,
  chain: Chain,
  moduleType: bigint,
  moduleAddress: Address
) {
  const publicClient = await getPublicClient(chain)
  const chainId = chain.id
  const smartWallet = getSmartWallet(address, chainId.toString())
  if (!smartWallet) throw new Error(`Account ${address} not found.`)
  const account = getAccount({
    address,
    type: 'erc7579-implementation',
    initCode: await smartWallet.getAccount().getInitCode(), // optional
    deployedOnChains: [chainId] // optional
  })
  const erc7579Module: Module = {
    module: moduleAddress,
    type: 'validator'
  }
  const isInstalled = await isModuleInstalled({
    client: publicClient, // The client object of type PublicClient from viem
    account, // The account object
    module: erc7579Module // The module object
  })

  return isInstalled
}
