import { Wallet } from 'ethers'

export let eip155Wallets: Record<string, Wallet>
export let eip155Addresses: string[]

let wallet1: Wallet
let wallet2: Wallet

export function createOrRestoreEIP155Wallet() {
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

  eip155Wallets = {
    [wallet1.address]: wallet1,
    [wallet2.address]: wallet2
  }
  eip155Addresses = Object.keys(eip155Wallets)

  return {
    eip155Wallets,
    eip155Addresses
  }
}
