import { getWallet } from '@/utils/TonWalletUtil'
import { getSignParamsMessage } from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import SettingsStore from '@/store/SettingsStore'
import { TON_SIGNING_METHODS } from '@/data/TonData'

type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>

export async function approveTonRequest(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { chainId, request } = params

  SettingsStore.setActiveChainId(chainId)

  const wallet = await getWallet()

  switch (request.method) {
    case TON_SIGNING_METHODS.TON_SIGN_MESSAGE:
      try {
        const message = request.params.message
        const signedMessage = await wallet.signMessage({
          message
        })
        return formatJsonRpcResult(id, signedMessage)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    case TON_SIGNING_METHODS.TON_SIGN_TRANSACTION:
      try {
        const result = await wallet.signTransaction({
          transaction: request.params.transaction,
          chainId
        })
        return formatJsonRpcResult(id, result)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    case TON_SIGNING_METHODS.TON_SIGN_AND_SEND_TRANSACTION:
      try {
        const result = await wallet.signAndSendTransaction(
          {
            transaction: request.params.transaction
          },
          chainId
        )
        return formatJsonRpcResult(id, result)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectTonRequest(request: RequestEventArgs) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message)
}
