import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { EIP5792_METHODS, GetCapabilitiesResult, SendCallsParams, supportedEIP5792CapabilitiesForEOA, supportedEIP5792CapabilitiesForSCA } from '@/data/EIP5792Data'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { providers } from 'ethers'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import SettingsStore from '@/store/SettingsStore'
import { smartAccountWallets } from './SmartAccountUtil'
import EIP155Lib from '@/lib/EIP155Lib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'
type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>


export async function approveEIP5792Request(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { chainId, request } = params

  console.log(requestEvent, chainId, 'tests')

  SettingsStore.setActiveChainId(chainId)

  const wallet = await getWallet(params)

  switch (request.method) {
    case EIP5792_METHODS.WALLET_GET_CAPABILITIES:
      /**
       * If the account in the params is a EOA return supportedEIP5792CapabilitiesForEOA
       * If the account in the params is a Smart Contract return supportedEIP5792CapabilitiesForSCA
       */
      if(wallet instanceof EIP155Lib)
        return formatJsonRpcResult<GetCapabilitiesResult>(id, supportedEIP5792CapabilitiesForEOA)
      else if(wallet instanceof SmartAccountLib || wallet instanceof KernelSmartAccountLib)
        return formatJsonRpcResult<GetCapabilitiesResult>(id, supportedEIP5792CapabilitiesForSCA)
      
    case EIP5792_METHODS.WALLET_GET_CALLS_STATUS:{
      // TODO: Added support for get calls status
      return formatJsonRpcError(id, "Not supported.")
    }

    case EIP5792_METHODS.WALLET_SHOW_CALLS_STATUS:{
      // TODO: Added support for show calls status
      return formatJsonRpcError(id, "Not supported.")
    }
      case EIP5792_METHODS.WALLET_SEND_CALLS:
        try {
          if(wallet instanceof EIP155Lib){
            /**
            * Not Supporting for batch calls on EOA for Now.
            * if EOA, we can submit call one by one, but need to have a data structure
            * to return bundle id, for all the calls, 
            */
            return formatJsonRpcError(id, "Wallet currently don't support batch call for EOA")
          } else if(wallet instanceof SmartAccountLib || wallet instanceof KernelSmartAccountLib){
            // chainId on request Params should be same as request Event 
            const sendCallParams:SendCallsParams = request.params as SendCallsParams
            if(chainId.split(':')[1] !== BigInt(sendCallParams.chainId).toString()) 
              return formatJsonRpcError(id, "ChainId mismatch")
      
            const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)
            const sendCalls = sendCallParams.calls
            const connectedWallet = await wallet.connect(provider)
            const hash = await connectedWallet.sendBatchTransaction(sendCalls)
            const receipt = typeof hash === 'string' ? hash : hash?.hash // TODO improve interface
            return formatJsonRpcResult(id, receipt)
          }
          return formatJsonRpcError(id, "Unable to recognize the account type")
        } catch (error: any) {
          console.error(error)
          alert(error.message)
          return formatJsonRpcError(id, error.message)
        }
        
    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectEIP5792Request(request: RequestEventArgs) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message)
}
