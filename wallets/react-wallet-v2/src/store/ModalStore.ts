import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  open: boolean
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

  open() {
    state.open = true
  },

  close() {
    state.open = false
  }
}

export default ModalStore
