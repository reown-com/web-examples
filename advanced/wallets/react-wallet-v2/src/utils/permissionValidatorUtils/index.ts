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
  accountType: 'KernelV3' | 'Safe7579'
  accountAddress: Address
  permissionValidatorAddress: Address
  permissions: SingleSignerPermission[]
  permittedScopeData: `0x${string}`
  permittedScopeSignature: `0x${string}`
  enableSig?: `0x${string}`
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
