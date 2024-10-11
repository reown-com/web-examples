import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import SettingsStore from '@/store/SettingsStore'
import {
  EIP7715_METHOD,
  WalletGrantPermissionsRequest,
  WalletGrantPermissionsResponse
} from '@/data/EIP7715Data'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { walletkit } from './WalletConnectUtil'
import { smartAccountWallets } from './SmartAccountUtil'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>

function getSmartAccountLibFromSession(requestSession: SessionTypes.Struct, chainId: string) {
  const sessionAccounts = requestSession.namespaces['eip155'].accounts.filter(value =>
    value.startsWith(chainId)
  )
  const sessionAccountsAddresses = sessionAccounts.map(value => value.split(':').slice(1).join(':'))
  const smartAccounts = Object.keys(smartAccountWallets)
  const smartWalletAddress = smartAccounts.find(smartAccount =>
    sessionAccountsAddresses.some(address => address.toLowerCase() === smartAccount.toLowerCase())
  )

  if (!smartWalletAddress) {
    console.log('Library not initialized for requested address', {
      smartWalletAddress,
      values: Object.keys(smartAccountWallets)
    })
    throw new Error('Library not initialized for requested address')
  }
  const lib = smartAccountWallets[smartWalletAddress]
  if (lib) {
    return lib
  }
  console.log('Library not found', {
    target: `${smartWalletAddress}`,
    values: Object.keys(smartAccountWallets)
  })
  throw new Error('Cannot find wallet for requested address')
}

export async function approveEIP7715Request(requestEvent: RequestEventArgs) {
  const { params, id, topic } = requestEvent
  const requestSession = walletkit.engine.signClient.session.get(topic)
  const { chainId, request } = params
  SettingsStore.setActiveChainId(chainId)
  switch (request.method) {
    case EIP7715_METHOD.WALLET_GRANT_PERMISSIONS: {
      const wallet = getSmartAccountLibFromSession(requestSession, chainId)
      let grantPermissionsRequestParams: WalletGrantPermissionsRequest = request.params[0]
      if (
        wallet instanceof SafeSmartAccountLib
        //TODO:fix kernel grantPermissions
        // || wallet instanceof KernelSmartAccountLib
      ) {
        const grantPermissionsResponse: WalletGrantPermissionsResponse =
          await wallet.grantPermissions(grantPermissionsRequestParams)
        return formatJsonRpcResult<WalletGrantPermissionsResponse>(id, grantPermissionsResponse)
      }

      // for any other wallet instance return un_supported
      return formatJsonRpcError(id, getSdkError('UNSUPPORTED_ACCOUNTS').message)
    }
    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectEIP7715Request(request: RequestEventArgs) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message)
}

export function createErrorResponse(request: RequestEventArgs, errorMessage: string) {
  const { id } = request

  return formatJsonRpcError(id, errorMessage)
}
