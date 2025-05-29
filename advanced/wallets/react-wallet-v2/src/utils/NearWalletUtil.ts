import { NearWallet } from '@/lib/NearLib'
import { generateSeedPhrase } from 'near-seed-phrase'

export let nearAddresses: string[]
export let nearWallet: NearWallet
const SEED_PHRASE_KEY = 'NEAR_SEED_PHRASE'

/**
 * Utilities
 */
export async function createOrRestoreNearWallet() {
  const seedPhrase = localStorage.getItem(SEED_PHRASE_KEY) || generateSeedPhrase().seedPhrase

  // NEAR only supports dev accounts in testnet.
  const wallet = await NearWallet.init('testnet', seedPhrase)

  localStorage.setItem(SEED_PHRASE_KEY, seedPhrase)

  const accounts = await wallet.getAllAccounts()
  console.log('near accounts', accounts)
  nearAddresses = accounts.map(x => x.accountId)
  nearWallet = wallet

  return {
    nearWallet,
    nearAddresses
  }
}
