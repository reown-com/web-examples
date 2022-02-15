import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  testNets: boolean
}

/**
 * State
 */
const state = proxy<State>({
  testNets: false
})

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  toggleTestNets() {
    state.testNets = !state.testNets
  }
}

export default SettingsStore
