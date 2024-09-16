import { decodeDIDToPublicKey, KEY_TYPES } from '@/utils/HelperUtil'
import {
  MOCK_VALIDATOR_ADDRESSES,
  MULTIKEY_SIGNER_ADDRESSES,
  TIME_FRAME_POLICY_ADDRESSES
} from './SmartSessionUtil'
import type { Session, ChainSession, Account } from '@rhinestone/module-sdk'
const {
  SMART_SESSIONS_ADDRESS,
  SmartSessionMode,
  getPermissionId,
  getSessionDigest,
  getSessionNonce,
  encode1271Hash,
  encodeSmartSessionSignature,
  hashChainSessions,
  encodeUseOrEnableSmartSessionSignature,
  decodeSmartSessionSignature
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
import {
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  Hex,
  http,
  pad,
  parseAbiParameters,
  PublicClient,
  slice,
  toBytes,
  toFunctionSelector,
  toHex,
  WalletClient
} from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { ENTRYPOINT_ADDRESS_V07, getAccountNonce } from 'permissionless'
import { parsePublicKey } from 'webauthn-p256'
import { MultiKeySigner, Permission, Signer, SignerType } from '@/data/EIP7715Data'

type GetNonceWithContextParams = {
  publicClient: PublicClient
  account: Account
  permissionsContext: Hex
}
type GetDummySignatureParams = {
  publicClient: PublicClient
  permissionsContext: Hex
  account: Account
}
type FormatSignatureParams = {
  publicClient: PublicClient
  modifiedSignature: Hex
  permissionsContext: Hex
  account: Account
}
type GetSmartSessionContextParams = {
  walletClient: WalletClient
  account: Account
  permissions: Permission[]
  expiry: number
  signer: MultiKeySigner
}

export async function getSmartSessionContext({
  walletClient,
  account,
  permissions,
  expiry,
  signer
}: GetSmartSessionContextParams): Promise<`0x${string}`> {
  if (walletClient.chain === undefined) {
    throw new Error('GetSmartSessionContextParams:Chain is undefined')
  }
  if (walletClient.account === undefined) {
    throw new Error('wallet account is undefined')
  }

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
  console.log('permissionId', permissionId)
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

  // const formattedHash = encode1271Hash({
  //   account,
  //   chainId: chainId,
  //   validator: account.address,
  //   hash: permissionEnableHash
  // })

  const permissionEnableSig = await walletClient.signMessage({
    account: walletClient.account,
    // message: { raw: formattedHash }
    message: { raw: permissionEnableHash }
  })

  const encodedSmartSessionSignature = encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: '0x',
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: chainDigests,
        sessionToEnable: session,
        permissionEnableSig
      },
      validator: MOCK_VALIDATOR_ADDRESSES[chainId], //account.address,
      accountType: 'safe'
    }
  })

  const smartSessionContext = encodePacked(
    ['address', 'bytes'],
    [SMART_SESSIONS_ADDRESS, encodedSmartSessionSignature]
  )
  return smartSessionContext
}
export async function getDummySignature({
  publicClient,
  permissionsContext,
  account
}: GetDummySignatureParams) {
  const validatorAddress = slice(permissionsContext, 0, 20)
  if (validatorAddress.toLowerCase() !== SMART_SESSIONS_ADDRESS.toLowerCase()) {
    throw new Error('getDummySignature:Invalid permission context')
  }

  const smartSessionSignature = slice(permissionsContext, 20)
  const { permissionId, enableSessionData } = decodeSmartSessionSignature({
    signature: smartSessionSignature,
    account: account
  })

  if (!enableSessionData) {
    throw new Error('EnableSessionData is undefined, invalid smartSessionSignature')
  }
  const signerValidatorInitData =
    enableSessionData?.enableSession.sessionToEnable.sessionValidatorInitData
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

  return encodeUseOrEnableSmartSessionSignature({
    account: account,
    client: publicClient,
    enableSessionData: enableSessionData,
    permissionId: permissionId,
    signature: concatenatedDummySignature
  })
}
export async function formatSignature({
  publicClient,
  account,
  modifiedSignature,
  permissionsContext
}: FormatSignatureParams) {
  const validatorAddress = slice(permissionsContext, 0, 20)
  if (validatorAddress.toLowerCase() !== SMART_SESSIONS_ADDRESS.toLowerCase()) {
    throw new Error('formatSignature:Invalid permission context')
  }

  const smartSessionSignature = slice(permissionsContext, 20)
  const { permissionId, enableSessionData } = decodeSmartSessionSignature({
    signature: smartSessionSignature,
    account: account
  })

  if (!enableSessionData) {
    throw new Error('EnableSessionData is undefined, invalid smartSessionSignature')
  }

  return encodeUseOrEnableSmartSessionSignature({
    account: account,
    client: publicClient,
    enableSessionData: enableSessionData,
    permissionId: permissionId,
    signature: modifiedSignature
  })
}
export async function getNonce({
  publicClient,
  account,
  permissionsContext
}: GetNonceWithContextParams): Promise<bigint> {
  const chainId = await publicClient.getChainId()
  const validatorAddress = slice(permissionsContext, 0, 20)
  if (validatorAddress.toLowerCase() !== SMART_SESSIONS_ADDRESS.toLowerCase()) {
    throw new Error('getNonce:Invalid permission context')
  }

  return await getAccountNonce(publicClient, {
    sender: account.address,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    key: BigInt(
      pad(validatorAddress, {
        dir: 'right',
        size: 24
      }) || 0
    )
  })
}

function getSamplePermissions(
  signers: Signer[],
  chainId: number,
  { permissions, expiry }: { permissions: Permission[]; expiry: number }
): Session {
  console.log({ expiry })
  return {
    sessionValidator: MULTIKEY_SIGNER_ADDRESSES[chainId],
    sessionValidatorInitData: encodeMultiKeySignerInitData(signers),
    salt: toHex(toBytes('1', { size: 32 })),
    userOpPolicies: [],
    actions: permissions.map(permission => ({
      actionTarget: permission.data.target,
      actionTargetSelector: toFunctionSelector(permission.data.functionName),
      actionPolicies: [
        {
          policy: TIME_FRAME_POLICY_ADDRESSES[chainId],
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
  for (const signer of signers) {
    encoded = encodePacked(['bytes', 'uint8', 'bytes'], [encoded, signer.type, signer.data as Hex])
  }

  return encoded
}

function decodeSigners(encodedData: `0x${string}`): Array<{ type: number; data: `0x${string}` }> {
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
