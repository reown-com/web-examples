import { Address, Chain, createPublicClient, http } from 'viem'
import { smartAccountWallets } from './SmartAccountUtil'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { Execution, Module } from '@rhinestone/module-sdk'
const { getAccount, isModuleInstalled, installModule } =
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
  module: Module
}) {
  const { accountAddress, chainId, module } = args
  console.log({ accountAddress, chainId, module })
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
  console.log(smartContractWallet)
  if (module && smartContractWallet?.chain && smartContractWallet instanceof SafeSmartAccountLib) {
    const client = await getPublicClient(smartContractWallet.chain)

    // Create the account object
    const account = getAccount({
      address: smartContractWallet.getAccount().address,
      initCode: await smartContractWallet.getAccount().getInitCode(),
      type: 'erc7579-implementation'
    })

    // Get the executions required to install the module
    const executions = await installModule({
      client,
      account,
      module
    })
    console.log(executions)
    const calls = executions.map(execution => {
      return {
        to: execution.target,
        data: execution.callData,
        value: BigInt(execution.value.toString())
      }
    })
    const txReceipt = await smartContractWallet.installModule(calls)
    console.log({ txReceipt })
    return txReceipt
  }
}

export async function manageERC7579Module(args: {
  accountAddress: string
  chainId: string
  executions: Execution[]
}) {
  const { accountAddress, chainId, executions } = args
  console.log({ accountAddress, chainId, executions })
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
  console.log(smartContractWallet)
  if (
    executions &&
    smartContractWallet?.chain &&
    smartContractWallet instanceof SafeSmartAccountLib
  ) {
    const client = await getPublicClient(smartContractWallet.chain)

    // Create the account object
    const account = getAccount({
      address: smartContractWallet.getAccount().address,
      initCode: await smartContractWallet.getAccount().getInitCode(),
      type: 'erc7579-implementation'
    })

    console.log(executions)
    const calls =
      executions &&
      executions.map(execution => {
        return {
          to: execution.target,
          data: execution.callData,
          value: BigInt(execution.value.toString())
        }
      })

    const txReceipt = await smartContractWallet.installModule(calls)
    console.log({ txReceipt })
    return txReceipt
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
