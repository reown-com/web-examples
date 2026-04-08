import CantonLib from '@/lib/CantonLib'

export let wallet1: CantonLib
export let wallet2: CantonLib
export let cantonWallets: Record<string, CantonLib>
export let cantonAddresses: string[]

export function getCantonWallet(encodedAddress: string): CantonLib | undefined {
  return cantonWallets[encodedAddress]
}

export function createOrRestoreCantonWallet() {
  const sk1 = localStorage.getItem('CANTON_SECRET_KEY_1')
  const sk2 = localStorage.getItem('CANTON_SECRET_KEY_2')

  if (sk1 && sk2) {
    try {
      wallet1 = CantonLib.init({ privateKey: new Uint8Array(Buffer.from(sk1, 'base64')) })
    } catch {
      wallet1 = CantonLib.init({})
      localStorage.setItem('CANTON_SECRET_KEY_1', wallet1.getSecretKeyBase64())
    }
    try {
      wallet2 = CantonLib.init({ privateKey: new Uint8Array(Buffer.from(sk2, 'base64')) })
    } catch {
      wallet2 = CantonLib.init({})
      localStorage.setItem('CANTON_SECRET_KEY_2', wallet2.getSecretKeyBase64())
    }
  } else {
    wallet1 = CantonLib.init({})
    wallet2 = CantonLib.init({})
    localStorage.setItem('CANTON_SECRET_KEY_1', wallet1.getSecretKeyBase64())
    localStorage.setItem('CANTON_SECRET_KEY_2', wallet2.getSecretKeyBase64())
  }

  const encoded1 = encodeURIComponent(wallet1.getPartyId())
  const encoded2 = encodeURIComponent(wallet2.getPartyId())

  cantonWallets = {
    [encoded1]: wallet1,
    [encoded2]: wallet2
  }
  cantonAddresses = Object.keys(cantonWallets)

  return {
    cantonWallets,
    cantonAddresses
  }
}
