import { COSMOS_MAINNET_CHAINS } from '@/data/COSMOSData'
// @ts-expect-error
import { Cosmos } from '@cosmostation/cosmosjs/src/index'

export const wallet1 = new Cosmos(
  'https://api.cosmos.network',
  COSMOS_MAINNET_CHAINS['cosmos:cosmoshub-4'].chainId
)
wallet1.path("m/44'/118'/0'/0/0")

export const wallet2 = new Cosmos(
  'https://api.cosmos.network',
  COSMOS_MAINNET_CHAINS['cosmos:cosmoshub-4'].chainId
)
wallet1.path("m/44'/118'/0'/0/1")

export let cosmosWallets: Record<string, Cosmos>
export let cosmosAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export function createOrRestoreCosmosWallet() {
  const mnemonic = localStorage.getItem('WALLET_MNEMONIC')

  if (mnemonic) {
    address1 = wallet1.getAddress(mnemonic)
    address2 = wallet2.getAddress(mnemonic)
  } else {
    // We can reuse same mnemonic for both wallets
    const mnemonic = wallet1.getRandomMnemonic()
    address1 = wallet1.getAddress(mnemonic)
    address2 = wallet2.getAddress(mnemonic)
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
