import { Wallet } from 'ethers'

const STORAGE_KEY = 'WALLET_MNEMONIC'

export let wallet: Wallet

export function createOrRestoreWallet() {
  const mnemonic = localStorage.getItem(STORAGE_KEY)

  if (mnemonic) {
    wallet = Wallet.fromMnemonic(mnemonic)
  } else {
    wallet = Wallet.createRandom()
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem(STORAGE_KEY, wallet.mnemonic.phrase)
  }
}
