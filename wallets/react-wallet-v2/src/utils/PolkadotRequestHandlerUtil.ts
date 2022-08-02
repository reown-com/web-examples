import { POLKADOT_SIGNING_METHODS } from '@/data/PolkadotData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { polkadotAddresses, polkadotWallets } from '@/utils/PolkadotWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approvePolkadotRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const wallet = polkadotWallets[getWalletAddressFromParams(polkadotAddresses, params)]

  switch (request.method) {
    case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE:
      const signature = await wallet.signMessage(request.params.message)
      return formatJsonRpcResult(id, signature)

    case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION:
      /*const signedTransaction = await wallet.signTransaction(
        request.params.feePayer,
        request.params.recentBlockhash,
        request.params.instructions
      )

      return formatJsonRpcResult(id, signedTransaction)*/
      return formatJsonRpcResult(id, 'Sign tx is not yet supported for Polkadot')

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectPolkadotRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
