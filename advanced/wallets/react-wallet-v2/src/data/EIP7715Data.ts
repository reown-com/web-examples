/**
 * EIP7715Method
 */
export const EIP7715_METHOD = {
  WALLET_GRANT_PERMISSIONS: 'wallet_grantPermissions'
}

export type Signer = WalletSigner | KeySigner | MultiKeySigner | AccountSigner
export type KeyType = 'secp256k1' | 'secp256r1' | 'ed25519' | 'schonorr'
// The types of keys that are supported for the following `key` and `keys` signer types.
export enum SignerKeyType {
  SECP256K1 = 0, // EOA - k1
  SECP256R1 = 1, // Passkey - r1
  ED25519 = 3,
  SCHNORR = 4
}
/*
 * A wallet is the signer for these permissions
 * `data` is not necessary for this signer type as the wallet is both the signer and grantor of these permissions
 */
export type WalletSigner = {
  type: 'wallet'
  data: Record<string, unknown>
}

/*
 * A signer representing a single key.
 * "Key" types are explicitly secp256r1 (p256) or secp256k1, and the public keys are hex-encoded.
 */
export type KeySigner = {
  type: 'key'
  data: {
    type: KeyType
    publicKey: `0x${string}`
  }
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

// An account that can be granted with permissions as in ERC-7710.
export type AccountSigner = {
  type: 'account'
  data: {
    address: `0x${string}`
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
// Native token transfer, e.g. ETH on Ethereum
export type NativeTokenTransferPermission = {
  type: 'native-token-transfer'
  data: {
    allowance: `0x${string}` // hex value
  }
}

// ERC20 token transfer
export type ERC20TokenTransferPermission = {
  type: 'erc20-token-transfer'
  data: {
    address: `0x${string}` // erc20 contract
    allowance: `0x${string}` // hex value
  }
}

// ERC721 token transfer
export type ERC721TokenTransferPermission = {
  type: 'erc721-token-transfer'
  data: {
    address: `0x${string}` // erc721 contract
    tokenIds: `0x${string}`[] // hex value array
  }
}

// ERC1155 token transfer
export type ERC1155TokenTransferPermission = {
  type: 'erc1155-token-transfer'
  data: {
    address: `0x${string}` // erc1155 contract
    allowances: {
      [tokenId: string]: `0x${string}` // hex value
    }
  }
}

// The maximum gas limit spent in the session in total
export type GasLimitPermission = {
  type: 'gas-limit'
  data: {
    limit: `0x${string}` // hex value
  }
}

// The number of calls the session can make in total
export type CallLimitPermission = {
  type: 'call-limit'
  data: {
    count: `0x${string}` // hex value
  }
}

// The number of calls the session can make during each interval
export type RateLimitPermission = {
  type: 'rate-limit'
  data: {
    count: `0x${string}` //hex value: the number of times during each interval
    interval: `0x${string}` //hex value in seconds
  }
}

// Union type for all possible permissions
export type Permission =
  | ContractCallPermission
  | NativeTokenTransferPermission
  | ERC20TokenTransferPermission
  | ERC721TokenTransferPermission
  | ERC1155TokenTransferPermission
  | GasLimitPermission
  | CallLimitPermission
  | RateLimitPermission
  | {
      type: string
      data: Record<string, unknown>
    }

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
