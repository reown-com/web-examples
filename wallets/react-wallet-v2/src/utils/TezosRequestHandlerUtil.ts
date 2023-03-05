import { TEZOS_SIGNING_METHODS } from '@/data/TezosData'
import { tezosAddresses, tezosWallets } from '@/utils/TezosWalletUtil'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveTezosRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params

  const wallet = tezosWallets[Object.keys(tezosWallets)[0]] // TODO: Select correct wallet

  switch (request.method) {
    case TEZOS_SIGNING_METHODS.TEZOS_GET_ACCOUNTS:
      return formatJsonRpcResult(id, [
        {
          algo: wallet.getCurve(),
          address: wallet.getAddress(),
          pubkey: wallet.getPublicKey()
        }
      ])

    case TEZOS_SIGNING_METHODS.TEZOS_SEND:
      const signedDirect = await wallet.signTransaction(request.params.signerAddress)
      return formatJsonRpcResult(id, signedDirect.prefixSig)

    case TEZOS_SIGNING_METHODS.TEZOS_SIGN:
      const signedAmino = await wallet.signPayload(request.params.signDoc)
      return formatJsonRpcResult(id, signedAmino.prefixSig)

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectTezosRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
