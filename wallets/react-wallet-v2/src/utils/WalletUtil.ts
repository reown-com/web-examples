import { Wallet } from 'ethers'

export let wallet: Wallet

export function createOrRestoreWallet() {
  const mnemonic = localStorage.getItem('WALLET_MNEMONIC')

  if (mnemonic) {
    wallet = Wallet.fromMnemonic(mnemonic)
  } else {
    wallet = Wallet.createRandom()
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('WALLET_MNEMONIC', wallet.mnemonic.phrase)
  }
}
