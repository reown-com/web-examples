import { UserOperation } from 'permissionless'
import { Address, Hex } from 'viem'

type Call = { to: Address; value: bigint; data: Hex }

type UserOp = UserOperation<'v0.7'>

export type FillUserOpParams = {
  chainId: number
  account: Address
  calls: Call[]
  capabilities: {
    paymasterService?: { url: string }
    permissions?: { context: Hex }
  }
}
export type FillUserOpResponse = {
  userOp: UserOp
  hash: Hex
}

export type ErrorResponse = {
  message: string
  error: string
}

export type SendUserOpWithSignatureParams = {
  chainId: Hex
  userOp: UserOp
  permissionsContext?: Hex
}
export type SendUserOpWithSignatureResponse = {
  receipt: Hex
}

export interface UserOpBuilder {
  fillUserOp(params: FillUserOpParams): Promise<FillUserOpResponse>
  sendUserOpWithSignature(
    params: SendUserOpWithSignatureParams
  ): Promise<SendUserOpWithSignatureResponse>
}
