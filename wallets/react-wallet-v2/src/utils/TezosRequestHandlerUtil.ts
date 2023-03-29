import { TEZOS_SIGNING_METHODS } from '@/data/TezosData'
import { tezosWallets } from '@/utils/TezosWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveTezosRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params

  const wallet = tezosWallets[request.params.account ?? Object.keys(tezosWallets)[0]]
  const allWallets = Object.keys(tezosWallets).map(key => tezosWallets[key])

  switch (request.method) {
    case TEZOS_SIGNING_METHODS.TEZOS_GET_ACCOUNTS:
      return formatJsonRpcResult(
        id,
        allWallets.map(wallet => ({
          algo: wallet.getCurve(),
          address: wallet.getAddress(),
          pubkey: wallet.getPublicKey()
        }))
      )

    case TEZOS_SIGNING_METHODS.TEZOS_SEND:
      const sendResponse = await wallet.signTransaction(request.params.operations)

      return formatJsonRpcResult(id, { hash: sendResponse })

    case TEZOS_SIGNING_METHODS.TEZOS_SIGN:
      const signResponse = await wallet.signPayload(request.params.payload)

      return formatJsonRpcResult(id, { signature: signResponse.prefixSig })

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectTezosRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
