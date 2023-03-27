import ElrondLib from '@/lib/ElrondLib'

export let wallet1: ElrondLib
export let wallet2: ElrondLib
export let elrondWallets: Record<string, ElrondLib>
export let elrondAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreElrondWallet() {
  const mnemonic1 = localStorage.getItem('ELROND_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('ELROND_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    wallet1 = await ElrondLib.init({ mnemonic: mnemonic1 })
    wallet2 = await ElrondLib.init({ mnemonic: mnemonic2 })
  } else {
    wallet1 = await ElrondLib.init({})
    wallet2 = await ElrondLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('ELROND_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('ELROND_MNEMONIC_2', wallet2.getMnemonic())
  }

  address1 = await wallet1.getAddress()
  address2 = await wallet2.getAddress()

  elrondWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  elrondAddresses = Object.keys(elrondWallets)

  return {
    elrondWallets,
    elrondAddresses
  }
}
