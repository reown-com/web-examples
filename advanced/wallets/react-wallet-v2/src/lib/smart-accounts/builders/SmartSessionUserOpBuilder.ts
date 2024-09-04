import {
  Address,
  decodeAbiParameters,
  encodeAbiParameters,
  getAddress,
  Hex,
  PublicClient
} from 'viem'
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

export async function getDummySignature(
  publicClient: PublicClient,
  params: {
    permissionsContext: Hex
    accountAddress: Address
  }
) {
  const { permissionsContext, accountAddress } = params
  if (!permissionsContext || permissionsContext.length < 178) {
    throw new Error('Permissions context too short')
  }

  const validatorAddress = permissionsContext.slice(0, 42) as Address

  if (getAddress(validatorAddress) !== getAddress(smartSessionAddress)) {
    throw new Error(
      `Validator ${validatorAddress} is not the smart session validator ${smartSessionAddress}`
    )
  }

  const enableData = `0x${permissionsContext.slice(178)}` as Hex
  const enableSession = decodeAbiParameters(enableSessionsStructAbi, enableData)
  const signerInitData = enableSession[0].isignerInitData
  console.log('signerInitData', signerInitData)
  const signers = decodeSigners(signerInitData)
  console.log('signers', signers)
  const dummySignatures: `0x${string}`[] = []
  const dummyECDSASignature: `0x${string}` =
    '0xe8b94748580ca0b4993c9a1b86b5be851bfc076ff5ce3a1ff65bf16392acfcb800f9b4f1aef1555c7fce5599fffb17e7c635502154a0333ba21f3ae491839af51c'
  const dummyPasskeySignature: `0x${string}` = '0x'
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i]
    if (signer.type === 0) {
      dummySignatures.push(dummyECDSASignature)
    } else if (signer.type === 1) {
      dummySignatures.push(dummyPasskeySignature)
    }
  }
  const concatenatedDummySignature = encodeAbiParameters([{ type: 'bytes[]' }], [dummySignatures])

  return formatSignature(publicClient, {
    signature: concatenatedDummySignature,
    permissionsContext,
    accountAddress
  })
}

export function decodeSigners(
  encodedData: `0x${string}`
): Array<{ type: number; data: `0x${string}` }> {
  let offset = 2 // Start after '0x'
  const signers: Array<{ type: number; data: `0x${string}` }> = []

  // Decode the number of signers
  const signersCount = parseInt(encodedData.slice(offset, offset + 2), 16)
  offset += 2

  for (let i = 0; i < signersCount; i++) {
    // Decode signer type
    const signerType = parseInt(encodedData.slice(offset, offset + 2), 16)
    offset += 2

    // Determine data length based on signer type
    let dataLength: number
    if (signerType === 0) {
      dataLength = 40 // 20 bytes
    } else if (signerType === 1) {
      dataLength = 128 // 64 bytes
    } else {
      throw new Error(`Unknown signer type: ${signerType}`)
    }

    // Decode signer data
    const signerData = `0x${encodedData.slice(offset, offset + dataLength)}` as `0x${string}`
    offset += dataLength

    signers.push({ type: signerType, data: signerData })
  }

  return signers
}
