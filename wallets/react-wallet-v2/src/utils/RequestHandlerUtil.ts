import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { RequestEvent } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'
import { Wallet } from 'ethers'

export async function approveEIP155Request(request: RequestEvent['request'], wallet: Wallet) {
  const { method, params, id } = request

  switch (method) {
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
      const personalSignResult = await wallet.signMessage(params[0])
      return formatJsonRpcResult(id, personalSignResult)

    case EIP155_SIGNING_METHODS.ETH_SIGN:
      const ethSignResult = await wallet.signMessage(params[1])
      return formatJsonRpcResult(id, ethSignResult)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectEIP155Request(request: RequestEvent['request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
