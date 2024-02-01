import { Verify, SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  testNets: boolean
  account: number
  eip155Address: string
  solanaAddress: string
  polkadotAddress: string
  nearAddress: string
  multiversxAddress: string
  tronAddress: string
  kadenaAddress: string
  relayerRegionURL: string
  activeChainId: string
  currentRequestVerifyContext?: Verify.Context
  sessions: SessionTypes.Struct[]
}

/**
 * State
 */
const state = proxy<State>({
  testNets: typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('TEST_NETS')) : true,
  account: 0,
  activeChainId: '1',
  eip155Address: '',
  solanaAddress: '',
  polkadotAddress: '',
  nearAddress: '',
  multiversxAddress: '',
  tronAddress: '',
  kadenaAddress: '',
  relayerRegionURL: '',
  sessions: []
})

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  setAccount(value: number) {
    state.account = value
  },

  setEIP155Address(eip155Address: string) {
    state.eip155Address = eip155Address
  },

  setSolanaAddress(solanaAddress: string) {
    state.solanaAddress = solanaAddress
  },

  setPolkadotAddress(polkadotAddress: string) {
    state.polkadotAddress = polkadotAddress
  },
  setNearAddress(nearAddress: string) {
    state.nearAddress = nearAddress
  },
  setKadenaAddress(kadenaAddress: string) {
    state.kadenaAddress = kadenaAddress
  },
  setRelayerRegionURL(relayerRegionURL: string) {
    state.relayerRegionURL = relayerRegionURL
  },

  setMultiversxAddress(multiversxAddress: string) {
    state.multiversxAddress = multiversxAddress
  },

  setTronAddress(tronAddress: string) {
    state.tronAddress = tronAddress
  },

  setActiveChainId(value: string) {
    state.activeChainId = value
  },

  setCurrentRequestVerifyContext(context: Verify.Context) {
    state.currentRequestVerifyContext = context
  },
  setSessions(sessions: SessionTypes.Struct[]) {
    state.sessions = sessions
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
