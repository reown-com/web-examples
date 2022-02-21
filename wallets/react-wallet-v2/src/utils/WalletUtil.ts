import { Wallet } from 'ethers'

export let wallets: Record<string, Wallet>
export let addresses: string[]
export let wallet1: Wallet
export let wallet2: Wallet

export function createOrRestoreWallet() {
  const mnemonic = localStorage.getItem('WALLET_MNEMONIC')

  if (mnemonic) {
    wallet1 = Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0")
    wallet2 = Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1")
  } else {
    wallet1 = Wallet.createRandom()
    wallet2 = Wallet.fromMnemonic(wallet1.mnemonic.phrase, "m/44'/60'/0'/0/1")
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('WALLET_MNEMONIC', wallet1.mnemonic.phrase)
  }

  wallets = {
    [wallet1.address]: wallet1,
    [wallet2.address]: wallet2
  }
  addresses = Object.keys(wallets)

  return {
    wallets,
    addresses
  }
}
