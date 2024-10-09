/**
 * EIP7715Method
 */
export const EIP7715_METHOD = {
  WALLET_GRANT_PERMISSIONS: 'wallet_grantPermissions'
}

export type Signer = MultiKeySigner
export type KeyType = 'secp256k1' | 'secp256r1'
// The types of keys that are supported for the following `key` and `keys` signer types.
export enum SignerKeyType {
  SECP256K1 = 0, // EOA - k1
  SECP256R1 = 1 // Passkey - r1
}
/*
 * A signer representing a multisig signer.
 * Each element of `publicKeys` are all explicitly the same `KeyType`, and the public keys are hex-encoded.
 */
export type MultiKeySigner = {
  type: 'keys'
  data: {
    keys: {
      type: KeyType
      publicKey: `0x${string}`
    }[]
  }
}

export type Policy = {
  type: string
  data: Record<string, unknown>
}
// Enum for parameter operators
enum ParamOperator {
  EQUAL = 'EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN'
  // Add other operators as needed
}

// Enum for operation types
enum Operation {
  Call = 'Call',
  DelegateCall = 'DelegateCall'
}

// Type for a single argument condition
type ArgumentCondition = {
  operator: ParamOperator
  value: any // You might want to be more specific based on your use case
}

// Type for a single function permission
type FunctionPermission = {
  functionName: string // Function name
  args: ArgumentCondition[] // An array of conditions, each corresponding to an argument for the function
  valueLimit: bigint // Maximum value that can be transferred for this specific function call
  operation?: Operation // (optional) whether this is a call or a delegatecall. Defaults to call
}
export type ContractCallPermission = {
  type: 'contract-call'
  data: {
    address: `0x${string}`
    abi: Record<string, unknown>[]
    functions: FunctionPermission[]
  }
}

// Union type for all possible permissions
export type Permission = ContractCallPermission

export type WalletGrantPermissionsRequest = {
  chainId: `0x${string}`
  address?: `0x${string}`
  expiry: number
  signer: Signer
  permissions: Permission[]
  policies: {
    type: string
    data: Record<string, unknown>
  }[]
}

export type WalletGrantPermissionsResponse = WalletGrantPermissionsRequest & {
  context: `0x${string}`
  accountMeta?: {
    factory: `0x${string}`
    factoryData: `0x${string}`
  }
  signerMeta?: {
    // 7679 userOp building
    userOpBuilder?: `0x${string}`
    // 7710 delegation
    delegationManager?: `0x${string}`
  }
}
