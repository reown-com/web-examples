import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import {
  createOrRestoreBiconomySmartAccount,
  createOrRestoreKernelSmartAccount,
  createOrRestoreSafeSmartAccount,
  removeSmartAccount
} from '@/utils/SmartAccountUtil'
import { Verify, SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'

const TEST_NETS_ENABLED_KEY = 'TEST_NETS'
const CA_ENABLED_KEY = 'CHAIN_ABSTRACTION'
const SMART_ACCOUNTS_ENABLED_KEY = 'SMART_ACCOUNTS'
const ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY = 'ZERO_DEV_SMART_ACCOUNTS'
const SAFE_SMART_ACCOUNTS_ENABLED_KEY = 'SAFE_SMART_ACCOUNTS'
const BICONOMY_SMART_ACCOUNTS_ENABLED_KEY = 'BICONOMY_SMART_ACCOUNTS'
const MODULE_MANAGEMENT_ENABLED_KEY = 'MODULE_MANAGEMENT'

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
  kadenaAddress: string
  bip122Address: string
  suiAddress: string
  stacksAddress: Record<'mainnet' | 'testnet', string>
  tonAddress: string
  kernelSmartAccountAddress: string
  safeSmartAccountAddress: string
  biconomySmartAccountAddress: string
  relayerRegionURL: string
  activeChainId: string
  currentRequestVerifyContext?: Verify.Context
  sessions: SessionTypes.Struct[]
  smartAccountSponsorshipEnabled: boolean
  smartAccountEnabled: boolean
  kernelSmartAccountEnabled: boolean
  safeSmartAccountEnabled: boolean
  biconomySmartAccountEnabled: boolean
  moduleManagementEnabled: boolean
  chainAbstractionEnabled: boolean
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
  kadenaAddress: '',
  bip122Address: '',
  suiAddress: '',
  stacksAddress: { mainnet: '', testnet: '' },
  tonAddress: '',
  kernelSmartAccountAddress: '',
  safeSmartAccountAddress: '',
  biconomySmartAccountAddress: '',
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
      : false,
  safeSmartAccountEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY))
      : false,
  biconomySmartAccountEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY))
      : false,
  moduleManagementEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(MODULE_MANAGEMENT_ENABLED_KEY))
      : false,
  chainAbstractionEnabled:
    typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem(CA_ENABLED_KEY)) : false
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
  setbip122Address(bip122Address: string) {
    state.bip122Address = bip122Address
  },
  setSuiAddress(suiAddress: string) {
    state.suiAddress = suiAddress
  },
  setStacksAddress(chain: 'testnet' | 'mainnet', stacksAddress: string) {
    state.stacksAddress[chain] = stacksAddress
  },
  setTonAddress(tonAddress: string) {
    state.tonAddress = tonAddress
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
  setSafeSmartAccountAddress(smartAccountAddress: string) {
    state.safeSmartAccountAddress = smartAccountAddress
  },
  setBiconomySmartAccountAddress(smartAccountAddress: string) {
    state.biconomySmartAccountAddress = smartAccountAddress
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
  toggleModuleManagement() {
    state.moduleManagementEnabled = !state.moduleManagementEnabled
    if (state.moduleManagementEnabled) {
      localStorage.setItem(MODULE_MANAGEMENT_ENABLED_KEY, 'YES')
    } else {
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
    }
  },

  toggleChainAbstractionEnabled() {
    state.chainAbstractionEnabled = !state.chainAbstractionEnabled
    if (state.chainAbstractionEnabled) {
      localStorage.setItem(CA_ENABLED_KEY, 'YES')
    } else {
      localStorage.removeItem(CA_ENABLED_KEY)
    }
  },

  async toggleKernelSmartAccountsEnabled() {
    state.kernelSmartAccountEnabled = !state.kernelSmartAccountEnabled
    if (state.kernelSmartAccountEnabled) {
      const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
      const { kernelSmartAccountAddress } = await createOrRestoreKernelSmartAccount(
        eip155Wallets[eip155Addresses[0]].getPrivateKey()
      )
      SettingsStore.setKernelSmartAccountAddress(kernelSmartAccountAddress)
      localStorage.setItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
    } else {
      removeSmartAccount(SettingsStore.state.kernelSmartAccountAddress)
      SettingsStore.setKernelSmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY)
    }
  },

  async toggleSafeSmartAccountsEnabled() {
    state.safeSmartAccountEnabled = !state.safeSmartAccountEnabled
    if (state.safeSmartAccountEnabled) {
      const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
      const { safeSmartAccountAddress } = await createOrRestoreSafeSmartAccount(
        eip155Wallets[eip155Addresses[0]].getPrivateKey()
      )
      SettingsStore.setSafeSmartAccountAddress(safeSmartAccountAddress)
      localStorage.setItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
    } else {
      removeSmartAccount(SettingsStore.state.safeSmartAccountAddress)
      SettingsStore.setSafeSmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY)
    }
  },

  async toggleBiconomySmartAccountsEnabled() {
    state.biconomySmartAccountEnabled = !state.biconomySmartAccountEnabled
    if (state.biconomySmartAccountEnabled) {
      const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
      const { biconomySmartAccountAddress } = await createOrRestoreBiconomySmartAccount(
        eip155Wallets[eip155Addresses[0]].getPrivateKey()
      )
      SettingsStore.setBiconomySmartAccountAddress(biconomySmartAccountAddress)
      localStorage.setItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
    } else {
      removeSmartAccount(SettingsStore.state.biconomySmartAccountAddress)
      SettingsStore.setBiconomySmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY)
    }
  }
}

export default SettingsStore
