import SolanaLib from '@/lib/SolanaLib'

export let wallet1: SolanaLib
export let wallet2: SolanaLib
export let solanaWallets: Record<string, SolanaLib>
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
    wallet1 = SolanaLib.init({ secretKey: Uint8Array.from(secretArray1) })
    wallet2 = SolanaLib.init({ secretKey: Uint8Array.from(secretArray2) })
  } else {
    wallet1 = SolanaLib.init({})
    wallet2 = SolanaLib.init({})

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

  address1 = await wallet1.getAddress()
  address2 = await wallet2.getAddress()

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
