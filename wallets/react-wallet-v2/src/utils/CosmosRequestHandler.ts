import { COSMOS_SIGNING_METHODS } from '@/data/COSMOSData'
import { cosmosAddresses, cosmosWallets } from '@/utils/CosmosWalletUtil'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { RequestEvent } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'
import { parseSignDocValues } from 'cosmos-wallet'

export async function approveCosmosRequest(requestEvent: RequestEvent) {
  const { method, params, id } = requestEvent.request
  const wallet = cosmosWallets[getWalletAddressFromParams(cosmosAddresses, params)]

  switch (method) {
    case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
      const signedDirect = await wallet.signDirect(
        params.signerAddress,
        parseSignDocValues(params.signDoc)
      )
      return formatJsonRpcResult(id, signedDirect.signature)

    case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
      const signedAmino = await wallet.signAmino(params.signerAddress, params.signDoc)
      return formatJsonRpcResult(id, signedAmino.signature)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectCosmosRequest(request: RequestEvent['request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
