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
  testNets: typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('TEST_NETS')) : false
})

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  toggleTestNets() {
    state.testNets = !state.testNets
    if (state.testNets) {
      localStorage.setItem('TEST_NETS', 'YES')
    } else {
      localStorage.removeItem('TEST_NETS')
    }
  }
}

export default SettingsStore
