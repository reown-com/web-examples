import { Verify, SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

const TEST_NETS_ENABLED_KEY = 'TEST_NETS'
const SMART_ACCOUNTS_ENABLED_KEY = 'SMART_ACCOUNTS'
const ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY = 'ZERO_DEV_SMART_ACCOUNTS'
/**
 * Types
 */
interface State {
  testNets: boolean
  account: number
  eip155Address: string
  cosmosAddress: string
  solanaAddress: string
  polkadotAddress: string
  nearAddress: string
  multiversxAddress: string
  tronAddress: string
  tezosAddress: string
  kernelSmartAccountAddress: string
  kadenaAddress: string
  relayerRegionURL: string
  activeChainId: string
  currentRequestVerifyContext?: Verify.Context
  sessions: SessionTypes.Struct[]
  smartAccountSponsorshipEnabled: boolean
  smartAccountEnabled: boolean
  kernelSmartAccountEnabled: boolean
}

/**
 * State
 */
const state = proxy<State>({
  testNets:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(TEST_NETS_ENABLED_KEY))
      : true,
  account: 0,
  activeChainId: '1',
  eip155Address: '',
  cosmosAddress: '',
  solanaAddress: '',
  polkadotAddress: '',
  nearAddress: '',
  multiversxAddress: '',
  tronAddress: '',
  tezosAddress: '',
  kernelSmartAccountAddress: '',
  kadenaAddress: '',
  relayerRegionURL: '',
  sessions: [],
  smartAccountSponsorshipEnabled: false,
  smartAccountEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(SMART_ACCOUNTS_ENABLED_KEY))
      : false,
  kernelSmartAccountEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY))
      : false
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

  setCosmosAddress(cosmosAddresses: string) {
    state.cosmosAddress = cosmosAddresses
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

  setTezosAddress(tezosAddress: string) {
    state.tezosAddress = tezosAddress
  },

  setKernelSmartAccountAddress(smartAccountAddress: string) {
    state.kernelSmartAccountAddress = smartAccountAddress
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
      state.smartAccountSponsorshipEnabled = true
      localStorage.setItem(TEST_NETS_ENABLED_KEY, 'YES')
    } else {
      state.smartAccountSponsorshipEnabled = false
      localStorage.removeItem(TEST_NETS_ENABLED_KEY)
    }
  },

  toggleSmartAccountSponsorship() {
    if (!state.testNets) return
    state.smartAccountSponsorshipEnabled = !state.smartAccountSponsorshipEnabled
  },

  toggleSmartAccountEnabled() {
    state.smartAccountEnabled = !state.smartAccountEnabled
    if (state.smartAccountEnabled) {
      localStorage.setItem(SMART_ACCOUNTS_ENABLED_KEY, 'YES')
    } else {
      localStorage.removeItem(SMART_ACCOUNTS_ENABLED_KEY)
    }
  },

  toggleKernelSmartAccountsEnabled() {
    state.kernelSmartAccountEnabled = !state.kernelSmartAccountEnabled
    if (state.kernelSmartAccountEnabled) {
      localStorage.setItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
    } else {
      localStorage.removeItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY)
    }
  }
}

export default SettingsStore
