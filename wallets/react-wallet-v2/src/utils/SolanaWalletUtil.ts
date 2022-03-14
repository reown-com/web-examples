import { Solana } from '@/lib/Solana'

export let wallet1: Solana
export let wallet2: Solana
export let solanaWallets: Record<string, Solana>
export let solanaAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreSolanaWallet() {
  const secretKey1 = localStorage.getItem('SOLANA_SECRET_KEY_1')
  const secretKey2 = localStorage.getItem('SOLANA_SECRET_KEY_2')

  if (secretKey1 && secretKey2) {
    const secretArray1: number[] = Object.values(JSON.parse(secretKey1))
    const secretArray2: number[] = Object.values(JSON.parse(secretKey2))

    wallet1 = Solana.init(Uint8Array.from(secretArray1))
    wallet2 = Solana.init(Uint8Array.from(secretArray2))
    address1 = await wallet1.getAccount()
    address2 = await wallet2.getAccount()
  } else {
    wallet1 = Solana.init()
    wallet2 = Solana.init()
    address1 = await wallet1.getAccount()
    address2 = await wallet2.getAccount()
    // Don't store secretKey in local storage in a production project!
    localStorage.setItem(
      'SOLANA_SECRET_KEY_1',
      JSON.stringify(Array.from(wallet1.keypair.secretKey))
    )
    localStorage.setItem(
      'SOLANA_SECRET_KEY_2',
      JSON.stringify(Array.from(wallet2.keypair.secretKey))
    )
  }

  solanaWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  solanaAddresses = Object.keys(solanaWallets)

  return {
    solanaWallets,
    solanaAddresses
  }
}
