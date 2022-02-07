import WalletConnectClient from '@walletconnect/client'
import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  client: WalletConnectClient
}

/**
 * State
 */
const state = proxy<State>({
  client: undefined
})

/**
 * Store / Actions
 */
const WalletConnectStore = {
  state,

  async createWalletConnectClient() {
    const client = await WalletConnectClient.init({
      controller: true,
      logger: 'debug',
      projectId: '8f331b9812e0e5b8f2da2c7203624869',
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'React Wallet',
        description: 'React Wallet for WalletConnect',
        url: 'https://walletconnect.com/',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    })
    state.client = client
  }
}

export default WalletConnectStore
