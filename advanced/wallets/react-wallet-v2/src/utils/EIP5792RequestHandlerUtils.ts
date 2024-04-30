import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import {
  EIP5792_METHODS,
  GetCallsParams,
  GetCapabilitiesResult,
  SendCallsParams,
  supportedEIP5792CapabilitiesForEOA,
  supportedEIP5792CapabilitiesForSCA
} from '@/data/EIP5792Data'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import SettingsStore from '@/store/SettingsStore'
import EIP155Lib from '@/lib/EIP155Lib'
import { toHex } from 'viem'
import { providers } from 'ethers'
import { getCallsStatus, getSendCallData, sendBatchTransactionWithEOA } from './EIP5792WalletUtil'
type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>

export async function approveEIP5792Request(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { chainId, request } = params
  SettingsStore.setActiveChainId(chainId)
  switch (request.method) {
    case EIP5792_METHODS.WALLET_GET_CAPABILITIES: {
      const wallet = await getWallet(params)
      if (wallet instanceof EIP155Lib)
        return formatJsonRpcResult<GetCapabilitiesResult>(id, supportedEIP5792CapabilitiesForEOA)

      return formatJsonRpcResult<GetCapabilitiesResult>(id, supportedEIP5792CapabilitiesForSCA)
    }
    case EIP5792_METHODS.WALLET_GET_CALLS_STATUS: {
      try {
        const getCallParams = request.params[0] as GetCallsParams
        const receipt = await getCallsStatus(getCallParams)
        return formatJsonRpcResult(id, receipt)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    }

    case EIP5792_METHODS.WALLET_SHOW_CALLS_STATUS: {
      // TODO: Added support for show calls status
      return formatJsonRpcError(id, 'Not supported.')
    }
    case EIP5792_METHODS.WALLET_SEND_CALLS: {
      try {
        const wallet = await getWallet(params)
        const sendCallParams: SendCallsParams = request.params[0] as SendCallsParams
        const calls = getSendCallData(sendCallParams)
        // chainId on request Params should be same as request Event
        if (chainId.split(':')[1] !== BigInt(sendCallParams.chainId).toString())
          return formatJsonRpcError(id, 'ChainId mismatch')
        const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)
        if (wallet instanceof EIP155Lib) {
          const isChainSupported =
            supportedEIP5792CapabilitiesForEOA[
              toHex(EIP155_CHAINS[chainId as TEIP155Chain].chainId)
            ].atomicBatch?.supported || false
          if (!isChainSupported)
            return formatJsonRpcError(
              id,
              `Wallet currently don't support batch call for chainId ${chainId}`
            )
          const connectedWallet = wallet.connect(provider)
          const batchId = await sendBatchTransactionWithEOA(connectedWallet, calls)
          return formatJsonRpcResult(id, batchId)
        }
        const isChainSupported =
          supportedEIP5792CapabilitiesForSCA[toHex(EIP155_CHAINS[chainId as TEIP155Chain].chainId)]
            .atomicBatch?.supported || false
        if (!isChainSupported)
          return formatJsonRpcError(
            id,
            `Wallet currently don't support batch call for chainId ${chainId}`
          )
        const userOpHash = await wallet.sendBatchTransaction(calls)
        return formatJsonRpcResult(id, userOpHash)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }
    }
    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectEIP5792Request(request: RequestEventArgs) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message)
}
