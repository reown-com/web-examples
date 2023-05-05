import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { XRPL_SIGNING_METHODS } from '@/data/XRPLData'
import { xrplAddresses, xrplWallets } from '@/utils/XrplWalletUtil'

export async function approveXrplRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request, chainId } = params
  const wallet = xrplWallets[getWalletAddressFromParams(xrplAddresses, params)]

  switch (request.method) {
    case XRPL_SIGNING_METHODS.XRPL_SIGN_TRANSACTION:
      const signedTransaction = await wallet.signTransaction({
        chainId,
        tx_json: request.params.tx_json,
        autofill: request.params?.autofill,
        submit: request.params?.submit
      })
      return formatJsonRpcResult(id, signedTransaction)

    case XRPL_SIGNING_METHODS.XRPL_SIGN_TRANSACTION_FOR:
      const signedTransactionFor = await wallet.signTransactionFor({
        chainId,
        tx_signer: request.params.tx_signer,
        tx_json: request.params.tx_json,
        autofill: request.params?.autofill,
        submit: request.params?.submit
      })
      return formatJsonRpcResult(id, signedTransactionFor)

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectXrplRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
