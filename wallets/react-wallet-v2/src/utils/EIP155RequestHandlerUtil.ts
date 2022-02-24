import { EIP155_CHAINS, EIP155_SIGNING_METHODS, TEIP155Chain } from '@/data/EIP155Data'
import {
  getSignParamsMessage,
  getSignTypedDataParamsData,
  getWalletAddressFromParams
} from '@/utils/HelperUtil'
import { addresses, wallets } from '@/utils/WalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { RequestEvent } from '@walletconnect/types'
import { ERROR } from '@walletconnect/utils'
import { providers } from 'ethers'

export async function approveEIP155Request(requestEvent: RequestEvent) {
  const { method, params, id } = requestEvent.request
  const { chainId } = requestEvent
  const wallet = wallets[getWalletAddressFromParams(addresses, params)]

  switch (method) {
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      const message = getSignParamsMessage(params)
      const signedMessage = await wallet.signMessage(message)
      return formatJsonRpcResult(id, signedMessage)

    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      const { domain, types, message: data } = getSignTypedDataParamsData(params)
      // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
      delete types.EIP712Domain
      const signedData = await wallet._signTypedData(domain, types, data)
      return formatJsonRpcResult(id, signedData)

    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
      const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)
      const sendTransaction = params[0]
      const connectedWallet = wallet.connect(provider)
      const { hash } = await connectedWallet.sendTransaction(sendTransaction)
      return formatJsonRpcResult(id, hash)

    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
      const signTransaction = params[0]
      const signature = await wallet.signTransaction(signTransaction)
      return formatJsonRpcResult(id, signature)

    default:
      throw new Error(ERROR.UNKNOWN_JSONRPC_METHOD.format().message)
  }
}

export function rejectEIP155Request(request: RequestEvent['request']) {
  const { id } = request

  return formatJsonRpcError(id, ERROR.JSONRPC_REQUEST_METHOD_REJECTED.format().message)
}
