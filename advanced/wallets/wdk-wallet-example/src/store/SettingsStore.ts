import { proxy } from 'valtio'
import { SessionTypes } from '@walletconnect/types'
import { LoadedAccounts } from '@/lib/WDKWallet'

interface State {
  initialized: boolean
  accounts?: LoadedAccounts
  sessions: SessionTypes.Struct[]
  error?: string
}

const state = proxy<State>({
  initialized: false,
  sessions: []
})

const SettingsStore = {
  state,
  setInitialized(value: boolean) {
    state.initialized = value
  },
  setAccounts(accounts: LoadedAccounts) {
    state.accounts = accounts
  },
  setSessions(sessions: SessionTypes.Struct[]) {
    state.sessions = sessions
  },
  setError(error?: string) {
    state.error = error
  }
}

export default SettingsStore
