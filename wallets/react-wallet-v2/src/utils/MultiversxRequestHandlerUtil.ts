import { MULTIVERSX_SIGNING_METHODS } from '@/data/MultiversxData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { multiversxAddresses, multiversxWallets } from '@/utils/MultiversxWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveMultiversxRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const account = getWalletAddressFromParams(multiversxAddresses, params)
  const wallet = multiversxWallets[account]

  switch (request.method) {
    case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_MESSAGE:
      const signedMessage = await wallet.signMessage(request.params.message)
      return formatJsonRpcResult(id, signedMessage)

    case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_TRANSACTION:
      const signTransaction = request.params.transaction
      // Transactions must be signed with the Sender's Private Key before submitting them to the MultiversX Network.
      // Signing is performed with the Ed25519 algorithm.
      const signature = await wallet.signTransaction(signTransaction)

      return formatJsonRpcResult(id, signature)

    case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_TRANSACTIONS:
      // MultiversX Allows for a Batch of Transactions to be signed
      const signTransactions = request.params.transactions

      const signatures = await wallet.signTransactions(signTransactions)
      return formatJsonRpcResult(id, signatures)

    case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_LOGIN_TOKEN:
    case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_NATIVE_AUTH_TOKEN:
      // Sometimes a dApp (and its backend) might want to reliably assign an off-chain user identity to a MultiversX address.
      // On this purpose, the signing providers allow a login token to be used within the login flow  - this token is signed using the wallet of the user.
      // Afterwards, a backend application would normally verify the signature of the token
      const message = `${account}${request.params.token}`
      const { signature: signedLoginToken } = await wallet.signMessage(message)

      return formatJsonRpcResult(id, { signature: signedLoginToken })

    default:
      throw new Error(getSdkError('UNSUPPORTED_METHODS').message)
  }
}

export function rejectMultiversxRequest(
  request: SignClientTypes.EventArguments['session_request']
) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
