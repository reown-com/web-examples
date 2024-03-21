import XrplLib from '@/lib/XrplLib'

export let wallet1: XrplLib
export let wallet2: XrplLib
export let xrplWallets: Record<string, XrplLib>
export let xrplAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreXrplWallet() {
  const seed1 = localStorage.getItem('XRPL_SEED_1')
  const seed2 = localStorage.getItem('XRPL_SEED_2')

  if (seed1 && seed2) {
    wallet1 = XrplLib.init({ seed: seed1 })
    wallet2 = XrplLib.init({ seed: seed2 })
  } else {
    wallet1 = XrplLib.init({})
    wallet2 = XrplLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('XRPL_SEED_1', wallet1.seed)
    localStorage.setItem('XRPL_SEED_2', wallet2.seed)
  }

  address1 = wallet1.getAddress()
  address2 = wallet2.getAddress()

  xrplWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  xrplAddresses = Object.keys(xrplWallets)

  return {
    xrplWallets,
    xrplAddresses
  }
}
