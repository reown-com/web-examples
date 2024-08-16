import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import SettingsStore from '@/store/SettingsStore'
import { EIP7715_METHOD } from '@/data/EIP7715Data'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { web3wallet } from './WalletConnectUtil'
import { smartAccountWallets } from './SmartAccountUtil'
import { GrantPermissionsParameters, GrantPermissionsReturnType } from 'viem/experimental'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { WalletGrantPermissionsParameters, WalletGrantPermissionsReturnType } from 'viem'
type RequestEventArgs = Omit<SignClientTypes.EventArguments['session_request'], 'verifyContext'>

function getSmartWalletAddressFromSession(requestSession: SessionTypes.Struct) {
  const sessionAccounts = requestSession.namespaces['eip155'].accounts
  const sessionAccountsAddress = sessionAccounts.map(value => value.split(':').slice(1).join(':'))
  const smartAccounts = Object.keys(smartAccountWallets)
  const smartWalletAddress = smartAccounts.find(smartAccount =>
    sessionAccountsAddress.some(address => address.toLowerCase() === smartAccount.toLowerCase())
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
  const requestSession = web3wallet.engine.signClient.session.get(topic)
  const { chainId, request } = params
  SettingsStore.setActiveChainId(chainId)
  switch (request.method) {
    case EIP7715_METHOD.WALLET_GRANT_PERMISSIONS: {
      const wallet = getSmartWalletAddressFromSession(requestSession)
      let grantPermissionsRequestParams: WalletGrantPermissionsParameters = request.params[0]
      if (wallet instanceof SafeSmartAccountLib || wallet instanceof KernelSmartAccountLib) {
        const grantPermissionsResponse: WalletGrantPermissionsReturnType =
          await wallet.grantPermissions(grantPermissionsRequestParams)
        return formatJsonRpcResult<WalletGrantPermissionsReturnType>(id, grantPermissionsResponse)
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
