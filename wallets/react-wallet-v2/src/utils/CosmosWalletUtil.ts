import CosmosLib from '@/lib/CosmosLib'

export let wallet1: CosmosLib
export let wallet2: CosmosLib
export let cosmosWallets: Record<string, CosmosLib>
export let cosmosAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreCosmosWallet() {
  const mnemonic1 = localStorage.getItem('COSMOS_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('COSMOS_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    wallet1 = await CosmosLib.init({ mnemonic: mnemonic1 })
    wallet2 = await CosmosLib.init({ mnemonic: mnemonic2 })
    const account1 = await wallet1.getAccount()
    const account2 = await wallet2.getAccount()
    address1 = account1.address
    address2 = account2.address
  } else {
    wallet1 = await CosmosLib.init({})
    wallet2 = await CosmosLib.init({})
    const account1 = await wallet1.getAccount()
    const account2 = await wallet2.getAccount()
    address1 = account1.address
    address2 = account2.address
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('COSMOS_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('COSMOS_MNEMONIC_2', wallet2.getMnemonic())
  }

  cosmosWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  cosmosAddresses = Object.keys(cosmosWallets)

  return {
    cosmosWallets,
    cosmosAddresses
  }
}
