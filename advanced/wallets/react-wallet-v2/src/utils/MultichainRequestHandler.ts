import { SignClientTypes } from '@walletconnect/types'
import { parseChainId } from '@walletconnect/utils'
import { approveEIP155Request } from './EIP155RequestHandlerUtil'
import { approveSuiRequest } from './SuiRequestHandlerUtil'
import { approveSolanaRequest } from './SolanaRequestHandlerUtil'
import { approveBip122Request } from './Bip122RequestHandlerUtil'

export function approveMultichainRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const chainId = requestEvent.params.chainId
  const { namespace } = parseChainId(chainId)
  switch (namespace) {
    case 'eip155':
      return approveEIP155Request(requestEvent)
    case 'sui':
      return approveSuiRequest(requestEvent)
    case 'solana':
      return approveSolanaRequest(requestEvent)
    case 'bip122':
      return approveBip122Request(requestEvent)
    default:
      console.log('need to implement multichain request handler for', namespace)
  }
}
