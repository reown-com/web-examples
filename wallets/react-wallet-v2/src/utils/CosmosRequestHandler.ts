import { COSMOS_SIGNING_METHODS } from '@/data/COSMOSData'
import { cosmosAddresses, cosmosWallets } from '@/utils/CosmosWalletUtil'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'
import { parseSignDocValues } from 'cosmos-wallet'

export async function approveCosmosRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const wallet = cosmosWallets[getWalletAddressFromParams(cosmosAddresses, params)]

  switch (request.method) {
    case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
      const signedDirect = await wallet.signDirect(
        request.params.signerAddress,
        parseSignDocValues(request.params.signDoc)
      )
      return formatJsonRpcResult(id, signedDirect.signature)

    case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
      const signedAmino = await wallet.signAmino(
        request.params.signerAddress,
        request.params.signDoc
      )
      return formatJsonRpcResult(id, signedAmino.signature)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectCosmosRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
