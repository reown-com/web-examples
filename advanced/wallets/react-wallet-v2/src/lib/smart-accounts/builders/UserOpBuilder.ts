import { publicClientUrl } from '@/utils/SmartAccountUtil';
import { UserOperation } from 'permissionless'
import { Address, Chain, createPublicClient, Hex, http, parseAbi, PublicClient } from 'viem'

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
  message: string,
  error: string
}

export type SendUserOpWithSigantureParams = {
  chainId: Hex
  userOp: UserOp
  signature: Hex
  permissionsContext?: Hex
}
export type SendUserOpWithSigantureResponse = {
  receipt: Hex
}

export interface UserOpBuilder {
  fillUserOp(params: FillUserOpParams): Promise<FillUserOpResponse>
  sendUserOpWithSignature(
    params: SendUserOpWithSigantureParams
  ): Promise<SendUserOpWithSigantureResponse>
}

export enum ImplementationType{
  Safe = 'safe',
}

export type AccountImplementation = {
  type: ImplementationType,

}
type GetAccountImplementationParams = {
  account: Address
  chain?: Chain,
  publicClient?: PublicClient
}
export async function getAccountImplementation(params: GetAccountImplementationParams): Promise<AccountImplementation>{
  let publicClient = params.publicClient
  if (!publicClient) {
    if (!params.chain) {
      throw new Error('publicClient or chain must be provided')
    }
    publicClient = createPublicClient({
      transport: http(publicClientUrl({ chain: params.chain }))
    })
  }
  const accountImplementation = await publicClient.readContract({
    address: params.account,
    abi: parseAbi(['function accountId() external view returns (string memory accountImplementationId)']),
    functionName: 'accountId',
    args: []
  })
  if (accountImplementation.includes('safe')) {
    return {
      type: ImplementationType.Safe
    }
  }
  throw new Error('Unsupported implementation type') 

} 