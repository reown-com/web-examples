import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { getSignParamsMessage, getSignTypedDataParamsData } from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { RequestEvent } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'
import { Wallet } from 'ethers'

export async function approveEIP155Request(request: RequestEvent['request'], wallet: Wallet) {
  const { method, params, id } = request

  switch (method) {
    /**
     * Handle message signing requests
     */
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      const message = getSignParamsMessage(params)
      const signedMessage = await wallet.signMessage(message)
      return formatJsonRpcResult(id, signedMessage)

    /**
     * Handle data signing requests
     */
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      const { domain, types, message: data } = getSignTypedDataParamsData(params)

      // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
      delete types.EIP712Domain

      const signedData = await wallet._signTypedData(domain, types, data)
      return formatJsonRpcResult(id, signedData)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectEIP155Request(request: RequestEvent['request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
