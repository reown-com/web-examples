import { SignClientTypes } from '@walletconnect/types'
import { parseChainId } from '@walletconnect/utils'
import { approveEIP155Request } from './EIP155RequestHandlerUtil'
import { approveSuiRequest } from './SuiRequestHandlerUtil'
import { approveSolanaRequest } from './SolanaRequestHandlerUtil'
import { approveBip122Request } from './Bip122RequestHandlerUtil'

export async function approveMultichainRequest(
  requestEvent: SignClientTypes.EventArguments['session_request']
) {
  const chainId = requestEvent.params.chainId
  const { namespace } = parseChainId(chainId)
  let result: any
  switch (namespace) {
    case 'eip155':
      result = await approveEIP155Request(requestEvent)
      break
    case 'sui':
      result = await approveSuiRequest(requestEvent)
      break
    case 'solana':
      result = await approveSolanaRequest(requestEvent)
      break
    case 'bip122':
      result = await approveBip122Request(requestEvent)
    default:
      console.log('need to implement multichain request handler for', namespace)
  }

  return {
    chainId,
    result
  }
}
