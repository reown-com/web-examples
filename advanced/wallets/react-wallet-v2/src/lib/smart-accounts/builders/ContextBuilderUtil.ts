import { decodeDIDToPublicKey, KEY_TYPES } from '@/utils/HelperUtil'
import { mockValidator, multiKeySignerAddress, timeFramePolicyAddress } from '@biconomy/permission-context-builder'
import {
  type AccountType,
  type Session,
  type ChainSession,
  type EnableSessionData,
  
} from '@rhinestone/module-sdk'
const {
  getAccount,
  getPermissionId,
  getSessionDigest,
  getSessionNonce,
  SMART_SESSIONS_ADDRESS,
  // OWNABLE_VALIDATOR_ADDRESS,
  encodeSmartSessionSignature,
  SmartSessionMode,
  hashChainSessions,
  encodeUseOrEnableSmartSessionSignature,
  encodeValidationData
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

import { LibZip } from 'solady'
import {
  Address,
  createPublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  Hex,
  http,
  parseAbiParameters,
  PublicClient,
  toBytes,
  toFunctionSelector,
  toHex,
  WalletClient
} from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { parsePublicKey } from 'webauthn-p256'

const MULTIKEY_SIGNER_ADDRESS = multiKeySignerAddress[sepolia.id] as Address
export enum SignerType {
  EOA,
  PASSKEY
}

export type Signer = {
  type: SignerType
  data: string
}
export type MultiKeySigner = {
  type: 'keys'
  data: {
    ids: string[]
    address?: Address
  }
}
export type Permission = {
  type: PermissionType
  policies: Policy[]
  required: boolean
  data: any
}
export type Policy = {
  type: PolicyType
  data: any
}
export type PermissionType =
  | 'native-token-transfer'
  | 'erc20-token-transfer'
  | 'erc721-token-transfer'
  | 'erc1155-token-transfer'
  | {
      custom: any
    }
export type PolicyType =
  | 'gas-limit'
  | 'call-limit'
  | 'rate-limit'
  | 'spent-limit'
  | 'value-limit'
  | 'time-frame'
  | 'uni-action'
  | 'simpler-signer'
  | {
      custom: any
    }
export type GrantPermissionsRequestParams = {
  smartAccountAddress: `0x${string}`
  signer: MultiKeySigner
  permissions: Permission[]
  expiry: number
}

export async function getContext(
  walletClient: WalletClient,
  { smartAccountAddress, permissions, expiry, signer }: GrantPermissionsRequestParams
): Promise<`0x${string}`> {
  if (walletClient.chain === undefined) {
    throw new Error('Chain is undefined')
  }
  if (walletClient.account === undefined) {
    throw new Error('wallet account is undefined')
  }
  const account = getAccount({
    address: smartAccountAddress,
    type: 'safe'
  })
  const chainId = walletClient.chain.id

  let signers: Signer[] = []
  // if singer type if multiKeySigner
  if (signer.type === 'keys') {
    const publicKeys = signer.data.ids.map(id => decodeDIDToPublicKey(id))
    publicKeys.forEach(key => {
      if (key.keyType === KEY_TYPES.secp256k1) {
        const eoaAddress = publicKeyToAddress(key.key)
        const signer = { type: SignerType.EOA, data: eoaAddress }
        signers.push(signer)
      }
      if (key.keyType === KEY_TYPES.secp256r1) {
        const passkeyPublicKey = parsePublicKey(key.key as `0x${string}`)
        const signer = {
          type: SignerType.PASSKEY,
          data: encodeAbiParameters(parseAbiParameters('uint256, uint256'), [
            passkeyPublicKey.x,
            passkeyPublicKey.y
          ])
        }
        signers.push(signer)
      }
    })
  }
  const samplePermissionsSession: Session = getSamplePermissions(signers, chainId, {
    permissions,
    expiry
  })
  const session: Session = {
    ...samplePermissionsSession,
    salt: toHex(toBytes(55, { size: 32 }))
  }
  const publicClient = createPublicClient({
    chain: walletClient.chain,
    transport: http()
  })
  const permissionId = (await getPermissionId({
    client: publicClient,
    session
  })) as Hex

  const sessionNonce = await getSessionNonce({
    client: publicClient,
    account,
    permissionId
  })

  const sessionDigest = await getSessionDigest({
    client: publicClient,
    account,
    session,
    mode: SmartSessionMode.ENABLE,
    permissionId
  })

  const chainDigests = [
    {
      chainId: BigInt(chainId),
      sessionDigest
    }
  ]

  const chainSessions: ChainSession[] = [
    {
      chainId: BigInt(chainId),
      session: {
        ...session,
        account: account.address,
        smartSession: SMART_SESSIONS_ADDRESS,
        mode: 1,
        nonce: sessionNonce
      }
    }
  ]
  const permissionEnableHash = hashChainSessions(chainSessions)
  const permissionEnableSig = await walletClient.signMessage({
    account: walletClient.account,
    message: { raw: permissionEnableHash }
  })

  return encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: '0xe8b94748580ca0b4993c9a1b86b5be851bfc076ff5ce3a1ff65bf16392acfcb800f9b4f1aef1555c7fce5599fffb17e7c635502154a0333ba21f3ae491839af51c',
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: chainDigests,
        sessionToEnable: session,
        permissionEnableSig
      },
      validator: mockValidator[chainId], 
      accountType: 'safe'
    }
  })
}

export async function getDummySignature(
  publicClient: PublicClient,
  params: {
    permissionsContext: Hex
    accountAddress: Address
  }
) {
  const { permissionsContext, accountAddress } = params
  const { permissionId,signature, enableSessionData } = decodeSmartSessionSignature(permissionsContext)
  const account = getAccount({
    address: accountAddress,
    type: 'safe'
  })
  if (!enableSessionData) {
    throw new Error('EnableSessionData is undefined, invalid permissionsContext')
  }
  console.log("encodedSignature",signature)
  const signerValidatorInitData =
    enableSessionData?.enableSession.sessionToEnable.sessionValidatorInitData
  console.log('multiKeySignerValidatorInitData', signerValidatorInitData)
  const signers = decodeSigners(signerValidatorInitData)
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
  console.log('concatenatedDummySignature', concatenatedDummySignature)
  return encodeUseOrEnableSmartSessionSignature({
    account: account,
    client: publicClient,
    enableSessionData: enableSessionData,
    permissionId: permissionId,
    signature: concatenatedDummySignature
  })
}

export async function formatSignature(
  publicClient: PublicClient,
  params: {
    signature: Hex
    permissionsContext: Hex
    accountAddress: Address
  }
) {
  const { permissionsContext, signature, accountAddress } = params
  const { permissionId, enableSessionData } = decodeSmartSessionSignature(permissionsContext)
  const account = getAccount({
    address: accountAddress,
    type: 'safe'
  })
  if (!enableSessionData) {
    throw new Error('EnableSessionData is undefined, invalid permissionsContext')
  }
  return encodeUseOrEnableSmartSessionSignature({
    account: account,
    client: publicClient,
    enableSessionData: enableSessionData,
    permissionId: permissionId,
    signature: signature
  })
}

function getSamplePermissions(
  signers: Signer[],
  chainId: number,
  { permissions, expiry }: Omit<GrantPermissionsRequestParams, 'smartAccountAddress' | 'signer'>
): Session {
  return {
    sessionValidator:  MULTIKEY_SIGNER_ADDRESS,
    sessionValidatorInitData: encodeMultiKeySignerInitData(signers),
    salt: toHex(toBytes('1', { size: 32 })),
    userOpPolicies: [],
    actions: permissions.map(permission => ({
      actionTarget: permission.data.target,
      actionTargetSelector: toFunctionSelector(permission.data.functionName),
      actionPolicies: [
        {
          policy: timeFramePolicyAddress[chainId],
          initData: encodePacked(['uint128', 'uint128'], [BigInt(expiry), BigInt(0)]) // hardcoded for demo
        }
      ]
    })),
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: []
    }
  }
}

function encodeMultiKeySignerInitData(signers: Signer[]): Hex {
  let encoded: Hex = encodePacked(['uint8'], [signers.length])
  // signer.data = decoded public key from DID
  for (const signer of signers) {
    encoded = encodePacked(['bytes', 'uint8', 'bytes'], [encoded, signer.type, signer.data as Hex])
  }

  return encoded
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

export const decodeSmartSessionSignature = (
  encodedData: Hex
): {
  mode: Hex
  permissionId: Hex
  signature: Hex
  enableSessionData?: EnableSessionData
} => {
  const mode = `0x${encodedData.slice(2, 4)}` as Hex
  const permissionId = `0x${encodedData.slice(4, 68)}` as Hex
  const compressedData = `0x${encodedData.slice(68)}` as Hex
  // const [mode, permissionId, compressedData] = decodeAbiParameters(
  //   [{ type: 'bytes1' }, { type: 'bytes32' }, { type: 'bytes' }],
  //   encodedData
  // ) as [Hex, Hex, Hex]

  const decompressedData = LibZip.flzDecompress(compressedData) as Hex

  switch (mode) {
    case SmartSessionMode.USE:
      const [signature] = decodeAbiParameters([{ type: 'bytes' }], decompressedData) as [Hex]
      return { mode, permissionId, signature }

    case SmartSessionMode.ENABLE:
    case SmartSessionMode.UNSAFE_ENABLE:
      const { enableSessionData, signature: enableSignature } =
        decodeEnableSessionSignature(decompressedData)
      return { mode, permissionId, signature: enableSignature, enableSessionData }

    default:
      throw new Error(`Unknown mode ${mode}`)
  }
}

const decodeEnableSessionSignature = (
  encodedData: Hex
): { enableSessionData: EnableSessionData; signature: Hex } => {
  const [enableSessionDataEncoded, signature] = decodeAbiParameters(
    encodeEnableSessionSignatureAbi,
    encodedData
  ) as [any, Hex]

  const { chainDigestIndex, hashesAndChainIds, sessionToEnable, permissionEnableSig } =
    enableSessionDataEncoded

  const { validator, accountType, decodedSignature } =
    decodePermissionEnableSig(permissionEnableSig)

  const enableSessionData: EnableSessionData = {
    enableSession: {
      chainDigestIndex,
      hashesAndChainIds: hashesAndChainIds.map((digest: any) => ({
        chainId: BigInt(digest.chainId),
        sessionDigest: digest.sessionDigest
      })),
      sessionToEnable: {
        sessionValidator: sessionToEnable.sessionValidator,
        sessionValidatorInitData: sessionToEnable.sessionValidatorInitData,
        salt: sessionToEnable.salt,
        userOpPolicies: sessionToEnable.userOpPolicies.map((policy: any) => ({
          policy: policy.policy,
          initData: policy.initData
        })),
        erc7739Policies: {
          allowedERC7739Content: sessionToEnable.erc7739Policies.allowedERC7739Content,
          erc1271Policies: sessionToEnable.erc7739Policies.erc1271Policies.map((policy: any) => ({
            policy: policy.policy,
            initData: policy.initData
          }))
        },
        actions: sessionToEnable.actions.map((action: any) => ({
          actionTargetSelector: action.actionTargetSelector,
          actionTarget: action.actionTarget,
          actionPolicies: action.actionPolicies.map((policy: any) => ({
            policy: policy.policy,
            initData: policy.initData
          }))
        }))
      },
      permissionEnableSig: decodedSignature
    },
    validator,
    accountType
  }

  return { enableSessionData, signature }
}

const decodePermissionEnableSig = (
  encodedSig: Hex
): { validator: Address; accountType: AccountType; decodedSignature: Hex } => {
  if (encodedSig.startsWith('0x01')) {
    // Kernel type
    const validator = `0x${encodedSig.slice(4, 44)}` as Address
    const signature = `0x${encodedSig.slice(44)}` as Hex
    // const [, validator, signature] = decodeAbiParameters(
    //   [{ type: 'bytes1' }, { type: 'address' }, { type: 'bytes' }],
    //   encodedSig
    // ) as [Hex, Address, Hex]
    return { validator, accountType: 'kernel', decodedSignature: signature }
  } else {
    // Other types (erc7579-implementation, nexus, safe)
    const validator = `0x${encodedSig.slice(2, 42)}` as Address
    const signature = `0x${encodedSig.slice(42)}` as Hex
    // const [validator, signature] = decodeAbiParameters(
    //   [{ type: 'address' }, { type: 'bytes' }],
    //   encodedSig
    // ) as [Address, Hex]
    // Note: We can't determine the exact account type here, so we'll default to 'erc7579-implementation'
    return { validator, accountType: 'erc7579-implementation', decodedSignature: signature }
  }
}

export const encodeEnableSessionSignatureAbi = [
  {
    components: [
      {
        type: 'uint8',
        name: 'chainDigestIndex'
      },
      {
        type: 'tuple[]',
        components: [
          {
            internalType: 'uint64',
            name: 'chainId',
            type: 'uint64'
          },
          {
            internalType: 'bytes32',
            name: 'sessionDigest',
            type: 'bytes32'
          }
        ],
        name: 'hashesAndChainIds'
      },
      {
        components: [
          {
            internalType: 'contract ISessionValidator',
            name: 'sessionValidator',
            type: 'address'
          },
          {
            internalType: 'bytes',
            name: 'sessionValidatorInitData',
            type: 'bytes'
          },
          { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
          {
            components: [
              { internalType: 'address', name: 'policy', type: 'address' },
              { internalType: 'bytes', name: 'initData', type: 'bytes' }
            ],
            internalType: 'struct PolicyData[]',
            name: 'userOpPolicies',
            type: 'tuple[]'
          },
          {
            components: [
              {
                internalType: 'string[]',
                name: 'allowedERC7739Content',
                type: 'string[]'
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
              }
            ],
            internalType: 'struct ERC7739Data',
            name: 'erc7739Policies',
            type: 'tuple'
          },
          {
            components: [
              {
                internalType: 'bytes4',
                name: 'actionTargetSelector',
                type: 'bytes4'
              },
              {
                internalType: 'address',
                name: 'actionTarget',
                type: 'address'
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
          }
        ],
        internalType: 'struct Session',
        name: 'sessionToEnable',
        type: 'tuple'
      },
      {
        type: 'bytes',
        name: 'permissionEnableSig'
      }
    ],
    internalType: 'struct EnableSession',
    name: 'enableSession',
    type: 'tuple'
  },
  { type: 'bytes' }
] as const
