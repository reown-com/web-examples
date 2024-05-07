import { Address, Chain, Hex, encodePacked, keccak256 } from 'viem'

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
  permissionValidatorAddress: Address
  permissions: SingleSignerPermission[]
  permittedScopeData: `0x${string}`
  permittedScopeSignature: `0x${string}`
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
  /**
   * permissionEnableData =
   * [PermissionArrayLength] ----------- [uint8]
   * [ChainIds] ------------------------ [chainIdsArray.length * uint64]
   * [permissionIds] ------------------- [permissionIds[]]
   * example: PermissionArrayLength = 1, chainId Array length = 1 , permissionIds ArrayLength = 1
   * permissionEnableData = 0x [01][0000000000aa36a7][permissionId]
   */
  let permittedScopeData: `0x${string}` = encodePacked(['uint8'], [permissions.length])
  // considering permission is on same chain
  const chainIds = [BigInt(chain.id)]
  for (let i = 0; i < chainIds.length; ++i) {
    permittedScopeData = encodePacked(['bytes', 'uint64'], [permittedScopeData, chainIds[i]])
  }
  return encodePacked(['bytes', 'bytes[]'], [permittedScopeData, permissionIds])
}
