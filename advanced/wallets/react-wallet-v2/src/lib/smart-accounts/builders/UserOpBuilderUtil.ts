import type { Account } from '@rhinestone/module-sdk'
const {
  SMART_SESSIONS_ADDRESS,
  encodeUseOrEnableSmartSessionSignature,
  decodeSmartSessionSignature
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
import { encodeAbiParameters, Hex, pad, PublicClient, slice } from 'viem'
import { ENTRYPOINT_ADDRESS_V07, getAccountNonce } from 'permissionless'

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
  const dummySignatures: `0x${string}`[] = []
  const dummyECDSASignature: `0x${string}` =
    '0xe8b94748580ca0b4993c9a1b86b5be851bfc076ff5ce3a1ff65bf16392acfcb800f9b4f1aef1555c7fce5599fffb17e7c635502154a0333ba21f3ae491839af51c'
  const dummyPasskeySignature: `0x${string}` =
    '0x00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000001635bc6d0f68ff895cae8a288ecf7542a6a9cd555df784b73e1e2ea7e9104b1db15e9015d280cb19527881c625fee43fd3a405d5b0d199a8c8e6589a7381209e40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f47b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22746278584e465339585f3442797231634d77714b724947422d5f3330613051685a36793775634d30424f45222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303030222c2263726f73734f726967696e223a66616c73652c20226f746865725f6b6579735f63616e5f62655f61646465645f68657265223a22646f206e6f7420636f6d7061726520636c69656e74446174614a534f4e20616761696e737420612074656d706c6174652e205365652068747470733a2f2f676f6f2e676c2f796162506578227d000000000000000000000000'
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i]
    if (signer.type === 0) {
      dummySignatures.push(dummyECDSASignature)
    } else if (signer.type === 1) {
      dummySignatures.push(dummyPasskeySignature)
    }
  }
  const concatenatedDummySignature = encodeAbiParameters([{ type: 'bytes[]' }], [dummySignatures])

  return await encodeUseOrEnableSmartSessionSignature({
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
