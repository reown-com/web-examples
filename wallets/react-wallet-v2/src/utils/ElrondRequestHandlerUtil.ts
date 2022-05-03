import { ELROND_SIGNING_METHODS } from '@/data/ElrondData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { elrondAddresses, elrondWallets } from '@/utils/ElrondWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { RequestEvent } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'

export async function approveElrondRequest(requestEvent: RequestEvent) {
  const { method, params, id } = requestEvent.request
  const wallet = elrondWallets[getWalletAddressFromParams(elrondAddresses, params)]

  switch (method) {
    case ELROND_SIGNING_METHODS.ELROND_SIGN_MESSAGE:
      const signedMessage = await wallet.signMessage(params.message)
      return formatJsonRpcResult(id, signedMessage)

    case ELROND_SIGNING_METHODS.ELROND_SIGN_TRANSACTION:
      const signTransaction = params[0]
      const signature = await wallet.signTransaction(signTransaction)
      return formatJsonRpcResult(id, signature)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectElrondRequest(request: RequestEvent['request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
