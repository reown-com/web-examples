import TonLib from '@/lib/TonLib'

export let wallet1: TonLib
export let wallet2: TonLib
export let tonWallets: Record<string, TonLib>
export let tonAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreTonWallet() {
  const secretKey1 = localStorage.getItem('TON_SECRET_KEY_1')
  const secretKey2 = localStorage.getItem('TON_SECRET_KEY_2')

  if (secretKey1 && secretKey2) {
    const secretArray1: number[] = Object.values(JSON.parse(secretKey1))
    const secretArray2: number[] = Object.values(JSON.parse(secretKey2))
    wallet1 = await TonLib.init({ secretKey: Uint8Array.from(secretArray1) })
    wallet2 = await TonLib.init({ secretKey: Uint8Array.from(secretArray2) })
  } else {
    wallet1 = await TonLib.init({})
    wallet2 = await TonLib.init({})

    // Don't store secretKey in local storage in a production project!
    localStorage.setItem('TON_SECRET_KEY_1', JSON.stringify(Array.from(wallet1.keypair.secretKey)))
    localStorage.setItem('TON_SECRET_KEY_2', JSON.stringify(Array.from(wallet2.keypair.secretKey)))
  }

  address1 = await wallet1.getAddress()
  address2 = await wallet2.getAddress()

  tonWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  tonAddresses = Object.keys(tonWallets)

  return {
    tonWallets,
    tonAddresses
  }
}

export const getWallet = async () => {
  return wallet1
}
