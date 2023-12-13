import TronLib from '@/lib/TronLib'

export let tronWeb1: TronLib
export let tronWeb2: TronLib
export let tronWallets: Record<string, TronLib>
export let tronAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export async function createOrRestoreTronWallet() {
  const privateKey1 = localStorage.getItem('TRON_PrivateKey_1')
  const privateKey2 = localStorage.getItem('TRON_PrivateKey_2')

  if (privateKey1 && privateKey2) {
    tronWeb1 = await TronLib.init({ privateKey: privateKey1 })
    tronWeb2 = await TronLib.init({ privateKey: privateKey2 })
  } else {
    tronWeb1 = await TronLib.init({ privateKey: '' })
    tronWeb2 = await TronLib.init({ privateKey: '' })

    // Don't store privateKey in local storage in a production project!
    localStorage.setItem('TRON_PrivateKey_1', tronWeb1.privateKey)
    localStorage.setItem('TRON_PrivateKey_2', tronWeb2.privateKey)
  }

  address1 = tronWeb1.getAddress()
  address2 = tronWeb2.getAddress()

  tronWallets = {
    [address1]: tronWeb1,
    [address2]: tronWeb2
  }

  tronAddresses = Object.keys(tronWallets)

  return {
    tronWallets,
    tronAddresses
  }
}
