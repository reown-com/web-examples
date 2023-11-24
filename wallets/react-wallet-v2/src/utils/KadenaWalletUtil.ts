import KadenaLib from '@/lib/KadenaLib'

export let wallet: KadenaLib
export let kadenaWallets: Record<string, KadenaLib>
export let kadenaAddresses: string[]

/**
 * Utilities
 */

export async function createOrRestoreKadenaWallet() {
  const secretKey = localStorage.getItem('KADENA_SECRET_KEY')

  if (secretKey) {
    wallet = KadenaLib.init({ secretKey })
  } else {
    wallet = KadenaLib.init({})
  }

  if (wallet.getSecretKey()) {
    localStorage.setItem('KADENA_SECRET_KEY', wallet.getSecretKey())
  }

  const address = wallet.getAddress()
  kadenaAddresses = [address]

  kadenaWallets = {
    [address]: wallet
  }

  return {
    kadenaWallets,
    kadenaAddresses
  }
}
