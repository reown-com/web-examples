import BitcoinLib from '@/lib/Bip122Lib'

export let wallet1: BitcoinLib
export let wallet2: BitcoinLib
export let bip122Wallet: BitcoinLib
export let bip122Addresses: string[]

let address1: string

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

  address1 = await wallet1.getAddress()
  console.log('address1', { address1, privateKey1 }, address1)

  bip122Wallet = wallet1
  bip122Addresses = [wallet1.getAddress()]

  return {
    bip122Wallet,
    bip122Addresses
  }
}
