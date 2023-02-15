import { IClientMeta, IWalletConnectSession } from '@walletconnect/legacy-types'
import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

/**
 * Types
 */
interface ModalData {
  proposal?: SignClientTypes.EventArguments['session_proposal']
  requestEvent?: SignClientTypes.EventArguments['session_request']
  requestSession?: SessionTypes.Struct
  legacyProposal?: {
    id: number
    params: [{ chainId: number; peerId: string; peerMeta: IClientMeta }]
  }
  legacyCallRequestEvent?: { id: number; method: string; params: any[] }
  legacyRequestSession?: IWalletConnectSession
}

interface State {
  open: boolean
  view?:
    | 'SessionProposalModal'
    | 'SessionSignModal'
    | 'SessionSignTypedDataModal'
    | 'SessionSendTransactionModal'
    | 'SessionUnsuportedMethodModal'
    | 'LegacySessionProposalModal'
    | 'LegacySessionSignModal'
    | 'LegacySessionSignTypedDataModal'
    | 'LegacySessionSendTransactionModal'
  data?: ModalData
}

/**
 * State
 */
const state = proxy<State>({
  open: false
})

/**
 * Store / Actions
 */
const ModalStore = {
  state,

  open(view: State['view'], data: State['data']) {
    state.view = view
    state.data = data
    state.open = true
  },

  close() {
    state.open = false
  }
}

export default ModalStore
