import { Address, Chain, createPublicClient, http } from 'viem'
import { smartAccountWallets } from './SmartAccountUtil'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { Execution, Module, ModuleType } from '@rhinestone/module-sdk'
import { getViemChain } from '@/data/chainsUtil'
const { getAccount, isModuleInstalled, installModule, getOwnableValidatorOwners } =
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
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
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
    const calls = executions.map(execution => {
      return {
        to: execution.target,
        data: execution.callData,
        value: BigInt(execution.value.toString())
      }
    })
    const txReceipt = await smartContractWallet.manageModule(calls)
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
  const smartContractWallet = getSmartWallet(accountAddress, chainId)
  if (
    executions &&
    smartContractWallet?.chain &&
    smartContractWallet instanceof SafeSmartAccountLib
  ) {
    const calls = executions.map(execution => {
      return {
        to: execution.target,
        data: execution.callData,
        value: BigInt(execution.value.toString())
      }
    })

    const txReceipt = await smartContractWallet.manageModule(calls)
    console.log({ txReceipt })
    return txReceipt
  }
}

export async function getERC7579OwnableValidatorOwners({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}): Promise<Address[]> {
  try {
    const smartContractWallet = getSmartWallet(accountAddress, chainId)
    if (smartContractWallet?.chain) {
      const client = await getPublicClient(smartContractWallet.chain)
      const account = getAccount({
        address: smartContractWallet.getAccount().address,
        initCode: await smartContractWallet.getAccount().getInitCode(),
        type: 'erc7579-implementation'
      })
      return (await getOwnableValidatorOwners({
        account,
        client
      })) as Address[]
    }
    return []
  } catch (err) {
    console.error(err)
    return []
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
  chainId: string,
  moduleType: ModuleType,
  moduleAddress: Address
) {
  const chain = getViemChain(parseInt(chainId))
  if (!chain) throw new Error(`Invalid chainId:${chainId}.`)
  const publicClient = await getPublicClient(chain)
  const smartWallet = getSmartWallet(address, chainId)
  if (!smartWallet) throw new Error(`Account ${address} not found.`)
  const account = getAccount({
    address,
    type: 'erc7579-implementation',
    initCode: await smartWallet.getAccount().getInitCode(), // optional
    deployedOnChains: [parseInt(chainId)] // optional
  })
  const erc7579Module: Module = {
    module: moduleAddress,
    type: moduleType
  }
  return await isModuleInstalled({
    client: publicClient, // The client object of type PublicClient from viem
    account, // The account object
    module: erc7579Module // The module object
  })
}

export const isModuleInstalledAbi = [
  {
    type: 'function',
    name: 'isModuleInstalled',
    inputs: [
      { name: 'moduleType', type: 'uint256', internalType: 'uint256' },
      { name: 'module', type: 'address', internalType: 'address' },
      {
        name: 'additionalContext',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view'
  }
] as const

export const AccountExecuteAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      },
      {
        internalType: 'enum Operation',
        name: '',
        type: 'uint8'
      }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'to',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'value',
            type: 'uint256'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          }
        ],
        internalType: 'struct Call[]',
        name: 'calls',
        type: 'tuple[]'
      }
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const
