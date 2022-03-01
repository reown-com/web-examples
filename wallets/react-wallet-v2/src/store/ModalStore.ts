import { SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

/**
 * Types
 */
interface ModalData {
  proposal?: SessionTypes.Proposal
  created?: SessionTypes.Created
  requestEvent?: SessionTypes.RequestEvent
  requestSession?: SessionTypes.Settled
}

interface State {
  open: boolean
  view?:
    | 'SessionProposalModal'
    | 'SessionSignModal'
    | 'SessionSignTypedDataModal'
    | 'SessionSendTransactionModal'
    | 'SessionUnsuportedMethodModal'
    | 'SessionSignCosmosModal'
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
