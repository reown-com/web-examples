import { STACKS_MAINNET_CAIP2, STACKS_TESTNET_CAIP2 } from '@/data/StacksData'
import StacksLib from '@/lib/StacksLib'

export let wallet1: StacksLib
export let wallet2: StacksLib
export let stacksWallet: StacksLib
export let stacksAddresses: string[]

/**
 * Utilities
 */
export async function createOrRestoreStacksWallet() {
  const mnemonic1 = localStorage.getItem('STACKS_MNEMONIC_1')

  if (mnemonic1) {
    wallet1 = await StacksLib.init({ mnemonic: mnemonic1 })
    // wallet2 = await StacksLib.init({ privateKey: privateKey2 })
  } else {
    wallet1 = await StacksLib.init({})
    // Don't store private keys in local storage in a production project!
    localStorage.setItem('STACKS_MNEMONIC_1', wallet1.getMnemonic())
    console.log('STACKS_MNEMONIC_1', wallet1.getMnemonic())
  }
  console.log('stacks addresses', wallet1.addresses)

  const addresses = wallet1.getAddresses()

  console.log('address1', { addresses, mnemonic1 }, addresses)

  stacksWallet = wallet1
  stacksAddresses = [
    `${STACKS_MAINNET_CAIP2}:${addresses.mainnet}`,
    `${STACKS_TESTNET_CAIP2}:${addresses.testnet}`
  ]

  return {
    stacksWallet,
    stacksAddresses
  }
}
