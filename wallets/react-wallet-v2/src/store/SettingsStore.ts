import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  testNets: boolean
  account: number
}

/**
 * State
 */
const state = proxy<State>({
  testNets: typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('TEST_NETS')) : true,
  account: 0
})

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  setAccount(value: number | string) {
    state.account = Number(value)
  },

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
