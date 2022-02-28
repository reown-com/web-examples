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
    wallet1 = await Cosmos.init({ mnemonic, path: "m/44'/118'/0'/0/0" })
    wallet2 = await Cosmos.init({ mnemonic, path: "m/44'/118'/0'/0/1" })
    const accounts1 = await wallet1.wallet.getAccounts()
    const accounts2 = await wallet2.wallet.getAccounts()
    address1 = accounts1[0].address
    address2 = accounts2[0].address
  } else {
    wallet1 = await Cosmos.init({ path: "m/44'/118'/0'/0/0" })
    const mnemonic = wallet1.keyring.mnemonic
    // We can reuse same mnemonic for both wallets
    wallet2 = await Cosmos.init({ mnemonic, path: "m/44'/118'/0'/0/1" })
    const accounts1 = await wallet1.wallet.getAccounts()
    const accounts2 = await wallet2.wallet.getAccounts()
    address1 = accounts1[0].address
    address2 = accounts2[0].address
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
