import { STELLAR_CHAINS, STELLAR_SIGNING_METHODS } from '@/data/StellarData'
import { getWalletAddressFromParams } from '@/utils/HelperUtil'
import { stellarAddresses, stellarWallet, stellarWallets } from '@/utils/StellarWalletUtil'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'

export async function approveStellarRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const { params, id } = requestEvent
  const { request, chainId } = params
  const requestParams = request.params

  // XDR payloads don't contain the plaintext `G...` address, so the substring
  // match may return nothing — fall back to the single restored Stellar wallet.
  const matchedAddress = getWalletAddressFromParams(stellarAddresses, params)
  const wallet = stellarWallets?.[matchedAddress] ?? stellarWallet

  if (!wallet) {
    return formatJsonRpcError(id, 'No Stellar wallet available')
  }

  // The signer address is echoed back as a CAIP-10 string bound to the session chain.
  const signerAddress = `${chainId}:${wallet.getAddress()}`

  try {
    switch (request.method) {
      case STELLAR_SIGNING_METHODS.STELLAR_SIGN_XDR: {
        const signedXDR = wallet.signXDR(requestParams.xdr, chainId)
        return formatJsonRpcResult(id, { signedXDR, signerAddress })
      }

      case STELLAR_SIGNING_METHODS.STELLAR_SIGN_AND_SUBMIT_XDR: {
        const rpcUrl = STELLAR_CHAINS[chainId]?.rpc
        const result = await wallet.signAndSubmitXDR(
          requestParams.xdr,
          chainId,
          rpcUrl,
          requestParams.waitForInclusion
        )
        return formatJsonRpcResult(id, result)
      }

      case STELLAR_SIGNING_METHODS.STELLAR_SIGN_MESSAGE: {
        const signature = wallet.signMessage(requestParams.message, requestParams.messageEncoding)
        return formatJsonRpcResult(id, { signature, signerAddress })
      }

      case STELLAR_SIGNING_METHODS.STELLAR_SIGN_AUTH_ENTRY: {
        const signedAuthEntry = await wallet.signAuthEntry(requestParams.authEntry, chainId)
        return formatJsonRpcResult(id, { signedAuthEntry, signerAddress })
      }

      default:
        throw new Error(getSdkError('INVALID_METHOD').message)
    }
  } catch (error) {
    console.error('[Stellar] request failed', error)
    return formatJsonRpcError(id, (error as Error)?.message ?? 'Failed to process Stellar request')
  }
}

export function rejectStellarRequest(request: SignClientTypes.EventArguments['session_request']) {
  const { id } = request

  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
