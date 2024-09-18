import { Address, Hex } from 'viem'

type Call = { to: Address; value: bigint; data: Hex }

export type UserOperationWithBigIntAsHex = {
  sender: Address
  nonce: Hex
  factory: Address | undefined
  factoryData: Hex | undefined
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
  paymaster: Address | undefined
  paymasterVerificationGasLimit: Hex | undefined
  paymasterPostOpGasLimit: Hex | undefined
  paymasterData: Hex | undefined
  signature: Hex
  initCode?: never
  paymasterAndData?: never
}
export type BuildUserOpRequestParams = {
  chainId: number
  account: Address
  calls: Call[]
  capabilities: {
    paymasterService?: { url: string }
    permissions?: { context: Hex }
  }
}
export type BuildUserOpResponseReturn = {
  userOp: UserOperationWithBigIntAsHex
  hash: Hex
}
export type ErrorResponse = {
  message: string
  error: string
}
export type SendUserOpRequestParams = {
  chainId: number
  userOp: UserOperationWithBigIntAsHex
  pci?: string
  permissionsContext?: Hex
}
export type SendUserOpResponseReturn = {
  userOpId: Hex
}

export interface UserOpBuilder {
  fillUserOp(params: BuildUserOpRequestParams): Promise<BuildUserOpResponseReturn>
  sendUserOpWithSignature(
    projectId: string,
    params: SendUserOpRequestParams
  ): Promise<SendUserOpResponseReturn>
}
