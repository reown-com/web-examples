import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import {
  createOrRestoreBiconomySmartAccount,
  createOrRestoreKernelSmartAccount,
  createOrRestoreSafeSmartAccount,
  removeSmartAccount
} from '@/utils/SmartAccountUtil'
import { Verify, SessionTypes } from '@walletconnect/types'
import { proxy } from 'valtio'
import { foundry, sepolia } from 'viem/chains'

const TEST_NETS_ENABLED_KEY = 'TEST_NETS'
const SMART_ACCOUNTS_ENABLED_KEY = 'SMART_ACCOUNTS'
const ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY = 'ZERO_DEV_SMART_ACCOUNTS'
const SAFE_SMART_ACCOUNTS_ENABLED_KEY = 'SAFE_SMART_ACCOUNTS'
const BICONOMY_SMART_ACCOUNTS_ENABLED_KEY = 'BICONOMY_SMART_ACCOUNTS'
const MODULE_MANAGEMENT_ENABLED_KEY = 'MODULE_MANAGEMENT'
const LOCAL_AA_INFRA_ENABLED_KEY = 'LOCAL_AA_INFRA'

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
  localAAInfraEnabled: boolean
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
  localAAInfraEnabled:
    typeof localStorage !== 'undefined'
      ? Boolean(localStorage.getItem(LOCAL_AA_INFRA_ENABLED_KEY))
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
  async toggleLocalAAInfra() {
    try {
      state.localAAInfraEnabled = !state.localAAInfraEnabled

      // Update local storage based on the state
      state.localAAInfraEnabled
        ? localStorage.setItem(LOCAL_AA_INFRA_ENABLED_KEY, 'YES')
        : localStorage.removeItem(LOCAL_AA_INFRA_ENABLED_KEY)

      // Define account types with corresponding properties
      const accountTypes = [
        {
          enabled: state.safeSmartAccountEnabled,
          address: SettingsStore.state.safeSmartAccountAddress,
          createOrRestore: createOrRestoreSafeSmartAccount,
          setter: SettingsStore.setSafeSmartAccountAddress
        },
        {
          enabled: state.kernelSmartAccountEnabled,
          address: SettingsStore.state.kernelSmartAccountAddress,
          createOrRestore: createOrRestoreKernelSmartAccount,
          setter: SettingsStore.setKernelSmartAccountAddress
        },
        {
          enabled: state.biconomySmartAccountEnabled,
          address: SettingsStore.state.biconomySmartAccountAddress,
          createOrRestore: createOrRestoreBiconomySmartAccount,
          setter: SettingsStore.setBiconomySmartAccountAddress
        }
      ]

      // Create or restore EIP-155 wallet
      const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
      const privateKey = eip155Wallets[eip155Addresses[0]].getPrivateKey()
      const newChain = state.localAAInfraEnabled ? foundry : sepolia
      const oldChain = state.localAAInfraEnabled ? sepolia : foundry

      // Process account types concurrently
      await Promise.all(
        accountTypes.map(async account => {
          // Remove smart account from the old chain
          removeSmartAccount(account.address, oldChain)

          if (account.enabled) {
            // Create or restore account on the new chain
            const result = await account.createOrRestore(privateKey, newChain)
            const [newAddress] = Object.values(result)
            account.setter(newAddress)
          }
        })
      )
    } catch (e) {
      state.localAAInfraEnabled = false
      localStorage.removeItem(LOCAL_AA_INFRA_ENABLED_KEY)
    }
  },

  async toggleKernelSmartAccountsEnabled() {
    state.kernelSmartAccountEnabled = !state.kernelSmartAccountEnabled
    if (state.kernelSmartAccountEnabled) {
      try {
        const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
        const chain = state.localAAInfraEnabled ? foundry : sepolia
        const { kernelSmartAccountAddress } = await createOrRestoreKernelSmartAccount(
          eip155Wallets[eip155Addresses[0]].getPrivateKey(),
          chain
        )
        SettingsStore.setKernelSmartAccountAddress(kernelSmartAccountAddress)
        localStorage.setItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
      } catch (e) {
        state.kernelSmartAccountEnabled = false
        localStorage.removeItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY)
      }
    } else {
      const chain = state.localAAInfraEnabled ? foundry : sepolia
      removeSmartAccount(SettingsStore.state.kernelSmartAccountAddress, chain)
      SettingsStore.setKernelSmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(ZERO_DEV_SMART_ACCOUNTS_ENABLED_KEY)
    }
  },

  async toggleSafeSmartAccountsEnabled() {
    state.safeSmartAccountEnabled = !state.safeSmartAccountEnabled
    if (state.safeSmartAccountEnabled) {
      try {
        const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
        const chain = state.localAAInfraEnabled ? foundry : sepolia
        const { safeSmartAccountAddress } = await createOrRestoreSafeSmartAccount(
          eip155Wallets[eip155Addresses[0]].getPrivateKey(),
          chain
        )
        SettingsStore.setSafeSmartAccountAddress(safeSmartAccountAddress)
        localStorage.setItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
      } catch (e) {
        state.safeSmartAccountEnabled = false
        localStorage.removeItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY)
      }
    } else {
      const chain = state.localAAInfraEnabled ? foundry : sepolia
      removeSmartAccount(SettingsStore.state.safeSmartAccountAddress, chain)
      SettingsStore.setSafeSmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(SAFE_SMART_ACCOUNTS_ENABLED_KEY)
    }
  },

  async toggleBiconomySmartAccountsEnabled() {
    state.biconomySmartAccountEnabled = !state.biconomySmartAccountEnabled
    if (state.biconomySmartAccountEnabled) {
      try {
        const { eip155Addresses, eip155Wallets } = createOrRestoreEIP155Wallet()
        const chain = state.localAAInfraEnabled ? foundry : sepolia
        const { biconomySmartAccountAddress } = await createOrRestoreBiconomySmartAccount(
          eip155Wallets[eip155Addresses[0]].getPrivateKey(),
          chain
        )
        SettingsStore.setBiconomySmartAccountAddress(biconomySmartAccountAddress)
        localStorage.setItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY, 'YES')
      } catch (e) {
        state.biconomySmartAccountEnabled = false
        localStorage.removeItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY)
      }
    } else {
      const chain = state.localAAInfraEnabled ? foundry : sepolia
      removeSmartAccount(SettingsStore.state.biconomySmartAccountAddress, chain)
      SettingsStore.setBiconomySmartAccountAddress('')
      state.moduleManagementEnabled = false
      localStorage.removeItem(MODULE_MANAGEMENT_ENABLED_KEY)
      localStorage.removeItem(BICONOMY_SMART_ACCOUNTS_ENABLED_KEY)
    }
  }
}

export default SettingsStore
