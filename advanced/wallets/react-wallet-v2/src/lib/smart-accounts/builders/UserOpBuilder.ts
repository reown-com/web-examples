import { Address, Hex } from 'viem'

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
export type ErrorResponse = {
  message: string
  error: string
}

export type PrepareCallsParams = {
  from: `0x${string}`
  chainId: `0x${string}`
  calls: {
    to: `0x${string}`
    data: `0x${string}`
    value: `0x${string}`
  }[]
  capabilities: Record<string, any>
}

export type PrepareCallsReturnValue = {
  preparedCalls: {
    type: string
    data: any
    chainId: `0x${string}`
  }
  signatureRequest: {
    hash: `0x${string}` // hash value of userOperation
  }
  context: string
}

export type SendPreparedCallsParams = {
  preparedCalls: {
    type: string
    data: any // userOp
    chainId: `0x${string}`
  }
  signature: `0x${string}`
  context: `0x${string}`
}

export type SendPreparedCallsReturnValue = string

export type GetCallsStatusParams = string
export type GetCallsStatusReturnValue = {
  status: 'PENDING' | 'CONFIRMED'
  receipts?: {
    logs: {
      address: `0x${string}`
      data: `0x${string}`
      topics: `0x${string}`[]
    }[]
    status: `0x${string}` // Hex 1 or 0 for success or failure, respectively
    blockHash: `0x${string}`
    blockNumber: `0x${string}`
    gasUsed: `0x${string}`
    transactionHash: `0x${string}`
  }[]
}
export interface UserOpBuilder {
  prepareCalls(projectId: string, params: PrepareCallsParams): Promise<PrepareCallsReturnValue>
  sendPreparedCalls(
    projectId: string,
    params: SendPreparedCallsParams
  ): Promise<SendPreparedCallsReturnValue>
}
