import WalletConnectClient from '@walletconnect/client'
import { Wallet } from 'ethers'
import KeyValueStorage from 'keyvaluestorage'
import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  initialized: boolean
  wallet: Wallet
  walletConnectClient: WalletConnectClient
}

/**
 * State
 */
const state = proxy<State>({
  initialized: false,
  wallet: undefined,
  walletConnectClient: undefined
})

/**
 * Store / Actions
 */
const WalletStore = {
  state,

  setInitialized(value: State['initialized']) {
    state.initialized = value
  },

  createWallet() {
    state.wallet = Wallet.createRandom()
  },

  async createWalletConnectClient() {
    const walletConnectClient = await WalletConnectClient.init({
      controller: true,
      logger: 'debug',
      projectId: '8f331b9812e0e5b8f2da2c7203624869',
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'React Wallet',
        description: 'React Wallet for WalletConnect',
        url: 'https://walletconnect.com/',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      },
      storage: new KeyValueStorage()
    })
    state.walletConnectClient = walletConnectClient
  }
}

export default WalletStore
