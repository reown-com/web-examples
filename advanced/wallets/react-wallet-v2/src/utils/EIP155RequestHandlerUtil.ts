import { EIP155_CHAINS, EIP155_SIGNING_METHODS, TEIP155Chain } from '@/data/EIP155Data'
import EIP155Lib from '@/lib/EIP155Lib'
import { SmartAccountLib } from '@/lib/SmartAccountLib'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import {
  getSignParamsMessage,
  getSignTypedDataParamsData,
  getWalletAddressFromParams
} from '@/utils/HelperUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { providers } from 'ethers'
import { Hex } from 'viem'
import { allowedChains } from './SmartAccountUtils'
type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>


const getWallet = async (params: any) => {
  const requestParams: Array<any> = params?.request?.params || []
  const eoaWallet = eip155Wallets[getWalletAddressFromParams(eip155Addresses, params)]
  if (eoaWallet) {
    return eoaWallet
  }

  const deployedSmartAccounts = await Promise.all(Object.values(eip155Wallets).map(async (wallet) => {
    const smartAccount = new SmartAccountLib({
      privateKey: wallet.getPrivateKey() as Hex,
      chain: allowedChains[0], // TODO: FIX FOR MULTI NETWORK
      sponsored: true, // TODO: Sponsor for now but should be dynamic according to SettingsStore
    })
    const isDeployed = await smartAccount.checkIfSmartAccountDeployed()
    if (isDeployed) {
      return smartAccount
    }
    return null
  }));
  const validSmartAccounts = deployedSmartAccounts.filter(Boolean) as Array<SmartAccountLib>
  const smartAccountAddress = getWalletAddressFromParams(validSmartAccounts.map(acc => acc.address!), params)

  return validSmartAccounts.find((smartAccount) => smartAccount?.address === smartAccountAddress) as SmartAccountLib
}


export async function approveEIP155Request(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { chainId, request } = params
  const wallet = await getWallet(params)

  switch (request.method) {
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      try {
        const message = getSignParamsMessage(request.params)
        const signedMessage = await wallet.signMessage(message)
        return formatJsonRpcResult(id, signedMessage)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }

    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      try {
        const { domain, types, message: data, primaryType } = getSignTypedDataParamsData(request.params)
        // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
        delete types.EIP712Domain
        const signedData = await wallet._signTypedData(domain, types, data, primaryType)
        return formatJsonRpcResult(id, signedData)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }

    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
      try {
        const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)
        const sendTransaction = request.params[0]
        const connectedWallet = await wallet.connect(provider)
        const hash = await connectedWallet.sendTransaction(sendTransaction)
        const receipt = typeof hash === 'string' ? hash : hash?.hash // TODO improve interface
        return formatJsonRpcResult(id, receipt)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }

    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
      try {
        const signTransaction = request.params[0]
        const signature = await wallet.signTransaction(signTransaction)
        return formatJsonRpcResult(id, signature)
      } catch (error: any) {
        console.error(error)
        alert(error.message)
        return formatJsonRpcError(id, error.message)
      }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectEIP155Request(request: RequestEventArgs) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message)
}
