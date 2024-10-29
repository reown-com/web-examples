import { KADENA_SIGNING_METHODS } from '@/data/KadenaData'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { getWalletAddressFromParams } from './HelperUtil'
import { BIP122_SIGNING_METHODS, IBip122ChainId } from '@/data/Bip122Data'
import { bip122Addresses, bip122Wallet } from './Bip122WalletUtil'

export async function approveBip122Request(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params
  const chainId = params.chainId as IBip122ChainId
  const account = request.params.account
  const wallet = bip122Wallet
  console.log('wallet:', wallet, bip122Wallet)
  console.log('account:', account)
  console.log('request:', request.method)
  switch (request.method) {
    case BIP122_SIGNING_METHODS.BIP122_SIGN_MESSAGE:
      const message = request.params.message
      const address = request.params.address
      const protocol = request.params.protocol
      console.log(
        'signing message:',
        message,
        'with address:',
        address || account,
        'chainId:',
        params
      )
      const signature = await wallet.signMessage({
        message,
        address: address || account,
        protocol,
        chainId
      })
      return formatJsonRpcResult(id, signature)
    case BIP122_SIGNING_METHODS.BIP122_SEND_TRANSACTION:
      const transactionParams = request.params
      console.log('signing transaction:', transactionParams, 'with account:', account)
      const txid = await wallet.sendTransfer({
        account: transactionParams.account,
        recipientAddress: transactionParams.recipientAddress,
        amount: transactionParams.amount,
        changeAddress: transactionParams.changeAddress,
        memo: transactionParams.memo,
        chainId
      })
      console.log('signed transaction:', txid)
      return formatJsonRpcResult(id, { txid })
    case BIP122_SIGNING_METHODS.BIP122_GET_ACCOUNT_ADDRESSES:
      console.log('getting addresses for account:', account)
      const addresses = wallet.getAddresses(chainId)
      return formatJsonRpcResult(id, Array.from(addresses.values()))
    case BIP122_SIGNING_METHODS.BIP122_SIGN_PSBT:
      const psbt = request.params.psbt
      const signInputs = request.params.signInputs
      const broadcast = request.params.broadcast
      console.log(
        'signing psbt:',
        psbt,
        'with account:',
        account,
        'inputs:',
        signInputs,
        'broadcast:',
        broadcast
      )
      const result = await wallet.signPsbt({
        account,
        psbt,
        signInputs,
        broadcast,
        chainId
      })
      console.log('signed psbt:', result)
      return formatJsonRpcResult(id, result)
    default:
      throw new Error(getSdkError('UNSUPPORTED_METHODS').message)
  }
}

export function rejectBip122Request(
  request: SignClientTypes.EventArguments['session_request'],
  message?: string
) {
  const { id } = request

  return formatJsonRpcError(id, message || getSdkError('USER_REJECTED_METHODS').message)
}
