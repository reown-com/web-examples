import { NearWallet } from '@/lib/NearLib'

export let nearAddresses: string[]
export let nearWallet: NearWallet

/**
 * Utilities
 */
export async function createOrRestoreNearWallet() {
  // NEAR only supports dev accounts in testnet.
  const wallet = await NearWallet.init('testnet')
  const accounts = await wallet.getAllAccounts()

  nearAddresses = accounts.map(x => x.accountId)
  nearWallet = wallet

  return {
    nearWallet,
    nearAddresses
  }
}
