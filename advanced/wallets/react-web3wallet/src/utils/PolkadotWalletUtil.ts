import PolkadotLib from '@/lib/PolkadotLib'
import { addressEq } from '@polkadot/util-crypto'

export let wallet1: PolkadotLib
export let wallet2: PolkadotLib
export let polkadotWallets: Record<string, PolkadotLib>
export let polkadotAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export function getPolkadotWallet(address: string) {
  let wallet = Object.entries(polkadotWallets).find(([walletAddress, _]) => {
    return addressEq(address, walletAddress)
  })
  return wallet?.[1]
}

export async function createOrRestorePolkadotWallet() {
  const mnemonic1 = localStorage.getItem('POLKADOT_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('POLKADOT_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    wallet1 = await PolkadotLib.init({ mnemonic: mnemonic1 })
    wallet2 = await PolkadotLib.init({ mnemonic: mnemonic2 })
  } else {
    wallet1 = await PolkadotLib.init({})
    wallet2 = await PolkadotLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('POLKADOT_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('POLKADOT_MNEMONIC_2', wallet2.getMnemonic())
  }

  address1 = wallet1.getAddress()
  address2 = wallet2.getAddress()

  polkadotWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  polkadotAddresses = Object.keys(polkadotWallets)

  return {
    polkadotWallets,
    polkadotAddresses
  }
}
