import { Wallet } from 'ethers'
import { proxy } from 'valtio'

/**
 * Types
 */
interface State {
  wallet?: Wallet
}

/**
 * State
 */
const state = proxy<State>({
  wallet: undefined
})

/**
 * Store / Actions
 */
const WalletStore = {
  state,

  createWallet() {
    state.wallet = Wallet.createRandom()
  }
}

export default WalletStore
