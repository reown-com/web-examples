import {TRON_MAINNET_CHAINS, TRON_TEST_CHAINS, TRON_SIGNING_METHODS} from '@/data/TronData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { tronAddresses, tronWallets } from '@/utils/TronWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
// @ts-ignore
import TronWeb from 'tronweb'

export async function approveTronRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request } = params

  const wallet = tronWallets[getWalletAddressFromParams(tronAddresses, params)]

  if(TRON_MAINNET_CHAINS[params.chainId]){
    wallet.setFullNode(TRON_MAINNET_CHAINS[params.chainId].fullNode)
  } else if(TRON_TEST_CHAINS[params.chainId]){
    wallet.setFullNode(TRON_TEST_CHAINS[params.chainId].fullNode)
  } else {
    throw new Error('Invalid chain id')
  }


  switch (request.method) {
    case TRON_SIGNING_METHODS.TRON_SIGN_MESSAGE:
      const signedMessage = await wallet.signMessage(request.params.message)
      const res = {
        signature: signedMessage
      }
      return formatJsonRpcResult(id, res)

    case TRON_SIGNING_METHODS.TRON_SIGN_TRANSACTION:
      const transaction = request.params.transaction.transaction
      const txPb = TronWeb.utils.transaction.txJsonToPb(transaction)
      const rawDataBytes = txPb.getRawData().serializeBinary()
      const rawDataHex = TronWeb.utils.bytes.byteArray2hexStr(rawDataBytes)
      const txID = TronWeb.utils.transaction.txPbToTxID(txPb)
      if (
        rawDataHex.toLowerCase() === transaction.raw_data_hex.toLowerCase() && txID.replace(/^0x/, '').toLowerCase() ===
        transaction.txID.replace(/^0x/, '').toLowerCase()
      ) {
        const signedTransaction = await wallet.signTransaction(request.params.transaction)
        const resData = {
          result: signedTransaction
        }
        return formatJsonRpcResult(id, resData)
      } else {
        throw new Error('Invalid transaction')
      }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectTronRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
