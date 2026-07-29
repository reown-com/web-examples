import StellarLib from '@/lib/StellarLib'

export let stellarWallet: StellarLib
export let stellarWallets: Record<string, StellarLib>
export let stellarAddresses: string[]

function registerStellarWallet() {
  const address = stellarWallet.getAddress()

  stellarWallets = {
    [address]: stellarWallet
  }
  stellarAddresses = Object.keys(stellarWallets)

  return {
    stellarWallets,
    stellarAddresses
  }
}

export async function createOrRestoreStellarWallet() {
  const secret = localStorage.getItem('STELLAR_SECRET')

  if (secret) {
    try {
      stellarWallet = StellarLib.init({ secret })

      return registerStellarWallet()
    } catch (error) {
      console.error('Failed to init Stellar wallet, creating new one:', error)
      localStorage.removeItem('STELLAR_SECRET')
    }
  }

  stellarWallet = StellarLib.init({})

  // Don't store the secret in local storage in a production project!
  localStorage.setItem('STELLAR_SECRET', stellarWallet.getSecret())

  return registerStellarWallet()
}
