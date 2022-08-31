import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

/**
 * Types
 */
interface ModalData {
  authenticationRequest: any
}

interface State {
  open: boolean
  view?: 'AuthenticationRequest'
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
