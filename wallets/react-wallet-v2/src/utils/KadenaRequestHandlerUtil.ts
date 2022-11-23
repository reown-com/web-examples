import { KADENA_SIGNING_METHODS } from '@/data/KadenaData'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { getWalletAddressFromParams } from './HelperUtil'
import { kadenaAddresses, kadenaWallets } from './KadenaWalletUtil'

export async function approveKadenaRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const account = getWalletAddressFromParams(kadenaAddresses, params)
  const wallet = kadenaWallets[account]

  switch (request.method) {
    case KADENA_SIGNING_METHODS.KADENA_SIGN_TRANSACTION:
      const signedRequest = wallet.signRequest(request.params.transaction)
      return formatJsonRpcResult(id, signedRequest)

    case KADENA_SIGNING_METHODS.KADENA_SIGN_MESSAGE:
      const signedMessage = wallet.signRequest(request.params.message)
      return formatJsonRpcResult(id, signedMessage)

    default:
      throw new Error(getSdkError('UNSUPPORTED_METHODS').message)
  }
}

export function rejectKadenaRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
