import {
  Address,
  Chain,
  Hex,
  PublicClient,
  WalletGrantPermissionsParameters,
  encodeAbiParameters,
  encodePacked,
  keccak256,
  toBytes
} from 'viem'
import { GrantPermissionsParameters } from 'viem/experimental'
import {
  MOCK_VALIDATOR_ADDRESS,
  PERMISSION_VALIDATOR_ADDRESS,
  WALLET_CONNECT_COSIGNER,
  YESPOLICY
} from './constants'
import { enableSessionAbi, smartSessionAbi, WebAuthnValidationDataAbi } from './abi'

export type SingleSignerPermission = {
  validUntil: number
  validAfter: number
  signatureValidationAlgorithm: Address
  signer: Address
  policy: Address
  policyData: `0x${string}`
}

export type PermissionContext = {
  accountAddress: Address
  initCode?: `0x${string}`
  permissionsContext?: `0x${string}`
  userOperationBuilder?: Address
  // below are rn temporary values needed to cover Kernel SC flow
  accountType: 'KernelV3' | 'Safe7579'
  permissionValidatorAddress: Address
  permissions: SingleSignerPermission[]
  permittedScopeData: `0x${string}`
  permittedScopeSignature: `0x${string}`
  enableSig?: `0x${string}`
}

export type ActionPolicy = {
  initData: `0x${string}`
  policy: `0x${string}`
}
export type UserOpPolicy = {
  initData: `0x${string}`
  policy: `0x${string}`
}
export type ERC1271Policy = {
  initData: `0x${string}`
  policy: `0x${string}`
}
export type ActionId = `0x${string}`

export type Action = {
  actionId: ActionId
  actionPolicies: ActionPolicy[]
}

export type EnableSession = {
  isigner: `0x${string}`
  isignerInitData: `0x${string}`
  actions: Action[]
  userOpPolicies: UserOpPolicy[]
  erc1271Policies: ERC1271Policy[]
  permissionEnableSig: `0x${string}`
}
export type PasskeyPublicKey = {
  pubKeyX: bigint
  pubKeyY: bigint
}

export function perpareMockWCCosignerEnableSession(signersInitData: `0x${string}`): EnableSession {
  const userOpPolicies: UserOpPolicy[] = [
    {
      initData: '0x' as `0x${string}`,
      policy: YESPOLICY
    }
  ]
  const actionId = keccak256(toBytes('MockAction01')) // just a random id
  const actions: Action[] = [
    {
      actionId: actionId,
      actionPolicies: userOpPolicies
    }
  ]

  const enableSessionParams: EnableSession = {
    isigner: WALLET_CONNECT_COSIGNER as `0x${string}`,
    actions: actions,
    isignerInitData: signersInitData,
    userOpPolicies: userOpPolicies,
    erc1271Policies: [],
    permissionEnableSig: '0x' as `0x${string}`
  }
  return enableSessionParams
}

export function getEOAAndPasskeySignerInitData(
  eoaAddress: Address,
  { pubKeyX, pubKeyY }: PasskeyPublicKey
): `0x${string}` {
  return encodeAbiParameters(
    [{ type: 'uint256' }, WebAuthnValidationDataAbi],
    [
      BigInt(eoaAddress),
      {
        pubKeyX,
        pubKeyY
      }
    ]
  )
}

export function generateSignerId(grantPermissionsRequestParams: WalletGrantPermissionsParameters) {
  const json = JSON.stringify(grantPermissionsRequestParams, (key, value) => {
    // Remove undefined values
    if (value === undefined) {
      return null
    }
    return value
  })
  const jsonBytes = new TextEncoder().encode(json)
  const hash = keccak256(jsonBytes)

  return hash
}

export async function getDigest(
  publicClient: PublicClient,
  args: {
    signerId: `0x${string}`
    accountAddress: `0x${string}`
    enableSession: EnableSession
  }
): Promise<`0x${string}`> {
  const { signerId, accountAddress, enableSession } = args
  return await publicClient.readContract({
    address: PERMISSION_VALIDATOR_ADDRESS,
    abi: smartSessionAbi,
    functionName: 'getDigest',
    args: [signerId, accountAddress, enableSession]
  })
}

export function getPermissionContext(
  signerId: `0x${string}`,
  enableSession: EnableSession,
  enableSessionSignature: `0x${string}`
) {
  enableSession.permissionEnableSig = encodePacked(
    ['address', 'bytes'],
    [MOCK_VALIDATOR_ADDRESS, enableSessionSignature] // TODO: MOCK_VALIDATOR_ADDRESS? defaultValidator?
  )
  const encodedEnableSessionData = encodeAbiParameters(enableSessionAbi, [enableSession])

  return encodePacked(
    ['address', 'bytes1', 'bytes32', 'bytes'],
    [PERMISSION_VALIDATOR_ADDRESS, '0x02', signerId, encodedEnableSessionData]
  )
}

export function getPermissionId(permission: SingleSignerPermission): `0x${string}` {
  return keccak256(
    encodePacked(
      ['uint48', 'uint48', 'address', 'address', 'address', 'bytes'],
      [
        permission.validUntil,
        permission.validAfter,
        permission.signatureValidationAlgorithm,
        permission.signer,
        permission.policy,
        permission.policyData
      ]
    )
  )
}

export function getPermissionScopeData(
  permissions: SingleSignerPermission[],
  chain: Chain
): `0x${string}` {
  const permissionIds: Hex[] = []
  for (let i = 0; i < permissions.length; i++) {
    permissionIds[i] = getPermissionId(permissions[i])
  }
  let permittedScopeData: `0x${string}` = encodePacked(['uint8'], [permissions.length])
  const chainIds = [BigInt(chain.id)]
  for (let i = 0; i < chainIds.length; ++i) {
    permittedScopeData = encodePacked(['bytes', 'uint64'], [permittedScopeData, chainIds[i]])
  }
  return encodePacked(['bytes', 'bytes[]'], [permittedScopeData, permissionIds])
}
