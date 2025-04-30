import { BIP122_MAINNET_CAIP2, BIP122_TESTNET_CAIP2 } from '@/data/Bip122Data'
import BitcoinLib from '@/lib/Bip122Lib'

export let wallet1: BitcoinLib
export let wallet2: BitcoinLib
export let bip122Wallet: BitcoinLib
export let bip122Addresses: string[]

/**
 * Utilities
 */
export async function createOrRestoreBip122Wallet() {
  const privateKey1 = localStorage.getItem('BITCOIN_PRIVATE_KEY_1')

  if (privateKey1) {
    wallet1 = await BitcoinLib.init({ privateKey: privateKey1 })
    // wallet2 = await BitcoinLib.init({ privateKey: privateKey2 })
  } else {
    wallet1 = await BitcoinLib.init({})
    // Don't store private keys in local storage in a production project!
    localStorage.setItem('BITCOIN_PRIVATE_KEY_1', wallet1.getPrivateKey())
    console.log('BITCOIN_PRIVATE_KEY_1', wallet1.getPrivateKey())
  }

  const mainnetAddress = wallet1.getAddress(BIP122_MAINNET_CAIP2)

  console.log('address1', { mainnetAddress, privateKey1 }, mainnetAddress)

  bip122Wallet = wallet1
  bip122Addresses = [
    `${BIP122_MAINNET_CAIP2}:${wallet1.getAddress(BIP122_MAINNET_CAIP2)}`,
    `${BIP122_MAINNET_CAIP2}:${wallet1.getOrdinalsAddress(BIP122_MAINNET_CAIP2)}`,
    `${BIP122_TESTNET_CAIP2}:${wallet1.getAddress(BIP122_TESTNET_CAIP2)}`,
    `${BIP122_TESTNET_CAIP2}:${wallet1.getOrdinalsAddress(BIP122_TESTNET_CAIP2)}`
  ]

  return {
    bip122Wallet,
    bip122Addresses
  }
}
