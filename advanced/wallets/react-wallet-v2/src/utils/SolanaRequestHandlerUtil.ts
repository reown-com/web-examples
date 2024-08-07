import { SOLANA_SIGNING_METHODS } from '@/data/SolanaData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { solanaAddresses, solanaWallets } from '@/utils/SolanaWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveSolanaRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request, chainId } = params
  const wallet = solanaWallets[getWalletAddressFromParams(solanaAddresses, params)]

  try {
    switch (request.method) {
      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
        const signedMessage = await wallet.signMessage(request.params)
        return formatJsonRpcResult(id, signedMessage)

      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
        const signedTransaction = await wallet.signTransaction(request.params)
        return formatJsonRpcResult(id, signedTransaction)

      case SOLANA_SIGNING_METHODS.SOLANA_SIGN_AND_SEND_TRANSACTION:
        const signedAndSentTransaction = await wallet.signAndSendTransaction(
          request.params,
          chainId
        )
        return formatJsonRpcResult(id, signedAndSentTransaction)

      default:
        throw new Error(getSdkError('INVALID_METHOD').message)
    }
  } catch (error) {
    return formatJsonRpcError(id, (error as Error)?.message)
  }
}

export function rejectSolanaRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
