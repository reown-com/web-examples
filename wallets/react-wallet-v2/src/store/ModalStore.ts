import { SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

/**
 * Types
 */
interface ModalData {
  proposal?: SessionTypes.Proposal
  created?: SessionTypes.Created
}

interface State {
  open: boolean
  view?: 'SessionProposalModal' | 'SessionCreatedModal'
  data?: ModalData
}

/**
 * State
 */
const state = proxy<State>({
  view: undefined,
  open: false,
  data: undefined
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
