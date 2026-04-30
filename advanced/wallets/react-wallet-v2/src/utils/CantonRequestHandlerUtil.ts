import { CANTON_SIGNING_METHODS } from '@/data/CantonData'
import { cantonWallets } from '@/utils/CantonWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveCantonRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request, chainId } = params
  const networkId = chainId ?? 'canton:devnet'

  const allWallets = Object.entries(cantonWallets)
  const primaryWallet = allWallets[0]
  const wallet = primaryWallet[1]
  const primaryEncoded = primaryWallet[0]

  switch (request.method) {
    case CANTON_SIGNING_METHODS.CANTON_LIST_ACCOUNTS:
      return formatJsonRpcResult(
        id,
        allWallets.map(([encoded, w]) => ({
          primary: encoded === primaryEncoded,
          partyId: decodeURIComponent(encoded),
          status: 'allocated',
          hint: 'operator',
          publicKey: w.getPublicKey(),
          namespace: w.getNamespace(),
          networkId,
          signingProviderId: 'participant',
          disabled: false
        }))
      )

    case CANTON_SIGNING_METHODS.CANTON_GET_PRIMARY_ACCOUNT:
      return formatJsonRpcResult(id, {
        primary: true,
        partyId: decodeURIComponent(primaryEncoded),
        status: 'allocated',
        hint: 'operator',
        publicKey: wallet.getPublicKey(),
        namespace: wallet.getNamespace(),
        networkId,
        signingProviderId: 'participant'
      })

    case CANTON_SIGNING_METHODS.CANTON_GET_ACTIVE_NETWORK:
      return formatJsonRpcResult(id, {
        networkId,
        ledgerApi: 'http://127.0.0.1:5003'
      })

    case CANTON_SIGNING_METHODS.CANTON_STATUS:
      return formatJsonRpcResult(id, {
        provider: {
          id: 'remote-da',
          version: 'TODO',
          providerType: 'remote'
        },
        connection: {
          isConnected: true,
          isNetworkConnected: true
        },
        network: {
          networkId,
          ledgerApi: 'http://127.0.0.1:5003'
        }
      })

    case CANTON_SIGNING_METHODS.CANTON_LEDGER_API: {
      const { resource } = request.params as { requestMethod: string; resource: string }
      if (resource === '/v2/version') {
        return formatJsonRpcResult(id, {
          response: JSON.stringify({ version: '3.4.0', features: {} })
        })
      }
      return formatJsonRpcResult(id, {
        response: JSON.stringify({ mock: true, resource })
      })
    }

    case CANTON_SIGNING_METHODS.CANTON_SIGN_MESSAGE: {
      const { message } = request.params as { message: string }
      const signature = wallet.signMessage(message)
      return formatJsonRpcResult(id, { signature })
    }

    case CANTON_SIGNING_METHODS.CANTON_PREPARE_SIGN_EXECUTE: {
      const { commandId } = request.params as { commandId?: string }
      return formatJsonRpcResult(id, {
        status: 'executed',
        commandId: commandId || 'mock-command-id',
        payload: {
          updateId: 'mock-tx-update-id',
          completionOffset: 42
        }
      })
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export function rejectCantonRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request
  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
