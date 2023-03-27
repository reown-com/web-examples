import { ELROND_SIGNING_METHODS } from '@/data/ElrondData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { elrondAddresses, elrondWallets } from '@/utils/ElrondWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveElrondRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const account = getWalletAddressFromParams(elrondAddresses, params)
  const wallet = elrondWallets[account]

  switch (request.method) {
    case ELROND_SIGNING_METHODS.ELROND_SIGN_MESSAGE:
      const signedMessage = await wallet.signMessage(request.params.message)
      return formatJsonRpcResult(id, signedMessage)

    case ELROND_SIGNING_METHODS.ELROND_SIGN_TRANSACTION:
      const signTransaction = request.params.transaction
      // Transactions must be signed with the Sender's Private Key before submitting them to the Elrond Network.
      // Signing is performed with the Ed25519 algorithm.
      const signature = await wallet.signTransaction(signTransaction)

      return formatJsonRpcResult(id, signature)

    case ELROND_SIGNING_METHODS.ELROND_SIGN_TRANSACTIONS:
      // Elrond Allows for a Batch of Transactions to be signed
      const signTransactions = request.params.transactions

      const signatures = await wallet.signTransactions(signTransactions)
      return formatJsonRpcResult(id, signatures)

    case ELROND_SIGNING_METHODS.ELROND_SIGN_LOGIN_TOKEN:
      // Sometimes a dApp (and its backend) might want to reliably assign an off-chain user identity to an Elrond address.
      // On this purpose, the signing providers allow a login token to be used within the login flow  - this token is signed using the wallet of the user.
      // Afterwards, a backend application would normally verify the signature of the token
      const message = `${account}${request.params.token}{}`
      const { signature: signedLoginToken } = await wallet.signMessage(message)

      return formatJsonRpcResult(id, { signature: signedLoginToken })

    default:
      throw new Error(getSdkError('UNSUPPORTED_METHODS').message)
  }
}

export function rejectElrondRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
