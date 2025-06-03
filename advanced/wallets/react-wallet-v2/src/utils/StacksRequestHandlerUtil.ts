import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

import { stacksWallet } from './StacksWalletUtil'
import { STACKS_SIGNING_METHODS } from '@/data/StacksData'

export async function approveStacksRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request, chainId } = params

  const wallet = stacksWallet

  switch (request.method) {
    case STACKS_SIGNING_METHODS.STACKS_SEND_TRANSFER:
      return formatJsonRpcResult(
        id,
        await wallet.sendTransfer({
          ...request.params,
          chainId
        })
      )

    case STACKS_SIGNING_METHODS.STACKS_SIGN_MESSAGE:
      return formatJsonRpcResult(
        id,
        await wallet.signMessage({
          ...request.params,
          chainId
        })
      )

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectStacksRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
