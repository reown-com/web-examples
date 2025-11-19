import { getWallet } from '@/utils/TonWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import SettingsStore from '@/store/SettingsStore'
import { TON_SIGNING_METHODS } from '@/data/TonData'

type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>

export async function validateTonRequest(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { request } = params

  const payload = Array.isArray(request.params) ? request.params[0] : request.params || {}

  const wallet = await getWallet()

  try {
    switch (request.method) {
      case TON_SIGNING_METHODS.SIGN_DATA:
        break
      case TON_SIGNING_METHODS.SEND_MESSAGE:
        wallet.validateSendMessage(payload)
    }
  } catch (error: any) {
    console.error(error)
    return formatJsonRpcError(id, error.message)
  }
}

export async function approveTonRequest(
  requestEvent: RequestEventArgs,
  session: SessionTypes.Struct
) {
  const { params, id } = requestEvent
  const { chainId, request } = params

  SettingsStore.setActiveChainId(chainId)

  const wallet = await getWallet()

  switch (request.method) {
    case TON_SIGNING_METHODS.SIGN_DATA:
      try {
        const payload = Array.isArray(request.params) ? request.params[0] : request.params
        const domain = new URL(session.peer.metadata.url).hostname
        const result = await wallet.signData(payload, domain)
        return formatJsonRpcResult(id, result)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    case TON_SIGNING_METHODS.SEND_MESSAGE:
      try {
        const txParams = request.params
        const result = await wallet.sendMessage(txParams, chainId)
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
