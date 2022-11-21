import { POLKADOT_SIGNING_METHODS } from '@/data/PolkadotData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { getPolkadotWallet, polkadotAddresses, polkadotWallets } from '@/utils/PolkadotWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approvePolkadotRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const address = request.params?.address
  const wallet = getPolkadotWallet(address)

  if (!wallet) {
    throw new Error('Polkadot wallet does not exist')
  }

  switch (request.method) {
    case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE:
      const signature = await wallet.signMessage(request.params.message)
      return formatJsonRpcResult(id, signature)

    case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION:
      const signedTx = await wallet?.signTransaction(request.params.transactionPayload)
      return formatJsonRpcResult(id, signedTx)

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectPolkadotRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
