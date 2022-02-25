import { Cosmos } from '@/utils/CosmosUtil'

export let wallet1: Cosmos
export let wallet2: Cosmos
export let cosmosWallets: Record<string, Cosmos>
export let cosmosAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreCosmosWallet() {
  const mnemonic = localStorage.getItem('WALLET_MNEMONIC')

  if (mnemonic) {
    wallet1 = new Cosmos({ mnemonic, path: "m/44'/118'/0'/0/0" })
    wallet2 = new Cosmos({ mnemonic, path: "m/44'/118'/0'/0/1" })
    address1 = await wallet1.getAddress()
    address2 = await wallet2.getAddress()
  } else {
    wallet1 = new Cosmos({ path: "m/44'/118'/0'/0/0" })
    const mnemonic = wallet1.mnemonic
    // We can reuse same mnemonic for both wallets
    wallet2 = new Cosmos({ mnemonic, path: "m/44'/118'/0'/0/1" })
    address1 = await wallet1.getAddress()
    address2 = await wallet2.getAddress()
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('WALLET_MNEMONIC', mnemonic)
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
