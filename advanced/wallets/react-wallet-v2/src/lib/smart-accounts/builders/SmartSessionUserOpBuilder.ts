import { Address, decodeAbiParameters, getAddress, Hex, PublicClient } from 'viem'
import { encodeEnable, encodeUse } from './EncodeLib'
import { smartSessionAddress } from '@biconomy/permission-context-builder'
import { readContract } from 'viem/actions'

export const enableSessionsStructAbi = [
  {
    components: [
      {
        name: 'isigner',
        type: 'address'
      },
      {
        name: 'isignerInitData',
        type: 'bytes'
      },
      {
        name: 'userOpPolicies',
        type: 'tuple[]',
        components: [
          {
            name: 'policy',
            type: 'address'
          },
          {
            name: 'initData',
            type: 'bytes'
          }
        ]
      },
      {
        name: 'erc1271Policies',
        type: 'tuple[]',
        components: [
          {
            name: 'policy',
            type: 'address'
          },
          {
            name: 'initData',
            type: 'bytes'
          }
        ]
      },
      {
        name: 'actions',
        type: 'tuple[]',
        components: [
          {
            name: 'actionId',
            type: 'bytes32'
          },
          {
            name: 'actionPolicies',
            type: 'tuple[]',
            components: [
              {
                name: 'policy',
                type: 'address'
              },
              {
                name: 'initData',
                type: 'bytes'
              }
            ]
          }
        ]
      },
      {
        name: 'permissionEnableSig',
        type: 'bytes'
      }
    ],
    name: 'EnableSessions',
    type: 'tuple'
  }
] as const

export const isPermissionsEnabledAbi = [
  {
    inputs: [
      {
        internalType: 'SignerId',
        name: 'signerId',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        components: [
          {
            internalType: 'contract ISigner',
            name: 'isigner',
            type: 'address'
          },
          {
            internalType: 'bytes',
            name: 'isignerInitData',
            type: 'bytes'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'policy',
                type: 'address'
              },
              {
                internalType: 'bytes',
                name: 'initData',
                type: 'bytes'
              }
            ],
            internalType: 'struct PolicyData[]',
            name: 'userOpPolicies',
            type: 'tuple[]'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'policy',
                type: 'address'
              },
              {
                internalType: 'bytes',
                name: 'initData',
                type: 'bytes'
              }
            ],
            internalType: 'struct PolicyData[]',
            name: 'erc1271Policies',
            type: 'tuple[]'
          },
          {
            components: [
              {
                internalType: 'ActionId',
                name: 'actionId',
                type: 'bytes32'
              },
              {
                components: [
                  {
                    internalType: 'address',
                    name: 'policy',
                    type: 'address'
                  },
                  {
                    internalType: 'bytes',
                    name: 'initData',
                    type: 'bytes'
                  }
                ],
                internalType: 'struct PolicyData[]',
                name: 'actionPolicies',
                type: 'tuple[]'
              }
            ],
            internalType: 'struct ActionData[]',
            name: 'actions',
            type: 'tuple[]'
          },
          {
            internalType: 'bytes',
            name: 'permissionEnableSig',
            type: 'bytes'
          }
        ],
        internalType: 'struct EnableSessions',
        name: 'enableData',
        type: 'tuple'
      }
    ],
    name: 'isPermissionEnabled',
    outputs: [
      {
        internalType: 'bool',
        name: 'isEnabled',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export async function formatSignature(
  publicClient: PublicClient,
  params: {
    signature: Hex
    permissionsContext: Hex
    accountAddress: Address
  }
) {
  const { signature, permissionsContext, accountAddress } = params
  if (!permissionsContext || permissionsContext.length < 178) {
    throw new Error('Permissions context too short')
  }
  const signerId = `0x${permissionsContext.slice(114, 178)}` as Hex

  if (permissionsContext.length == 178) {
    return encodeUse(signerId, signature)
  }

  const validatorAddress = permissionsContext.slice(0, 42) as Address

  if (getAddress(validatorAddress) !== getAddress(smartSessionAddress)) {
    throw new Error(
      `Validator ${validatorAddress} is not the smart session validator ${smartSessionAddress}`
    )
  }

  const enableData = `0x${permissionsContext.slice(178)}` as Hex
  const enableSession = Array.from(decodeAbiParameters(enableSessionsStructAbi, enableData))

  const isPermissionsEnabled = await readContract(publicClient, {
    address: smartSessionAddress,
    abi: isPermissionsEnabledAbi,
    functionName: 'isPermissionEnabled',
    args: [signerId, accountAddress, enableSession[0]]
  })

  if (isPermissionsEnabled) {
    return encodeUse(signerId, signature)
  } else {
    return encodeEnable(signerId, signature, enableSession[0])
  }
}
