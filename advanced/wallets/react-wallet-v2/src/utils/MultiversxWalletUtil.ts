import MultiversxLib from '@/lib/MultiversxLib'

export let wallet1: MultiversxLib
export let wallet2: MultiversxLib
export let multiversxWallets: Record<string, MultiversxLib>
export let multiversxAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreMultiversxWallet() {
  const mnemonic1 = localStorage.getItem('MULTIVERSX_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('MULTIVERSX_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    try {
      wallet1 = await MultiversxLib.init({ mnemonic: mnemonic1 })
    } catch (error) {
      console.error('Failed to init MultiversX wallet1, creating new one:', error)
      localStorage.removeItem('MULTIVERSX_MNEMONIC_1')
      wallet1 = await MultiversxLib.init({})
      localStorage.setItem('MULTIVERSX_MNEMONIC_1', wallet1.getMnemonic())
    }
    try {
      wallet2 = await MultiversxLib.init({ mnemonic: mnemonic2 })
    } catch (error) {
      console.error('Failed to init MultiversX wallet2, creating new one:', error)
      localStorage.removeItem('MULTIVERSX_MNEMONIC_2')
      wallet2 = await MultiversxLib.init({})
      localStorage.setItem('MULTIVERSX_MNEMONIC_2', wallet2.getMnemonic())
    }
  } else {
    wallet1 = await MultiversxLib.init({})
    wallet2 = await MultiversxLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('MULTIVERSX_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('MULTIVERSX_MNEMONIC_2', wallet2.getMnemonic())
  }

  address1 = await wallet1.getAddress()
  address2 = await wallet2.getAddress()

  multiversxWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  multiversxAddresses = Object.keys(multiversxWallets)

  return {
    multiversxWallets,
    multiversxAddresses
  }
}
