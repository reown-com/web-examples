import EIP155Lib from '@/lib/EIP155Lib'
import { smartAccountWallets } from './SmartAccountUtil'
import { getWalletAddressFromParams } from './HelperUtil'

export let wallet1: EIP155Lib
export let wallet2: EIP155Lib
export let eip155Wallets: Record<string, EIP155Lib> = {}
export let eip155Addresses: string[] = []

let address1: string
let address2: string

/**
 * Fetch E2E credentials (async, called before wallet init)
 *
 * Flow:
 * 1. Pre-encrypt mnemonic with scripts/encrypt-mnemonic.js
 * 2. Store encrypted value in E2E_ENCRYPTED_MNEMONIC secret
 * 3. Navigate to wallet with ?e2e_encrypted=<encrypted_value>
 * 4. This function decrypts via /api/e2e/decrypt and stores in localStorage
 * 5. createOrRestoreEIP155Wallet() reads from localStorage
 */
export async function fetchE2ECredentials(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  const urlParams = new URLSearchParams(window.location.search)
  let encrypted = urlParams.get('e2e_encrypted')

  // Fix URL encoding issues: spaces should be '+' in base64
  if (encrypted) {
    encrypted = encrypted.replace(/ /g, '+')
  }

  if (!encrypted) {
    return false
  }

  // Clear any existing wallet to force using E2E credentials
  localStorage.removeItem('EIP155_MNEMONIC_1')
  localStorage.removeItem('EIP155_MNEMONIC_2')

  try {
    const url = `/api/e2e/decrypt?data=${encodeURIComponent(encrypted)}`
    const response = await fetch(url)

    if (!response.ok) {
      return false
    }

    const data = await response.json()

    if (data.mnemonic) {
      localStorage.setItem('E2E_MNEMONIC', data.mnemonic)
      return true
    }

    return false
  } catch (error) {
    return false
  }
}

/**
 * Utilities
 */
export function createOrRestoreEIP155Wallet() {
  // Check for E2E mnemonic (set by fetchE2ECredentials)
  const e2eMnemonic = localStorage.getItem('E2E_MNEMONIC')

  if (e2eMnemonic) {
    // E2E mode: Use provided mnemonic for deterministic wallet
    localStorage.removeItem('E2E_MNEMONIC')

    // Persist as regular mnemonic so it survives page navigation
    localStorage.setItem('EIP155_MNEMONIC_1', e2eMnemonic)

    wallet1 = EIP155Lib.init({ mnemonic: e2eMnemonic })
    wallet2 = EIP155Lib.init({})
    localStorage.setItem('EIP155_MNEMONIC_2', wallet2.getMnemonic())
  } else {
    // Normal mode: Restore from localStorage or create new
    const mnemonic1 = localStorage.getItem('EIP155_MNEMONIC_1')
    const mnemonic2 = localStorage.getItem('EIP155_MNEMONIC_2')

    if (mnemonic1 && mnemonic2) {
      wallet1 = EIP155Lib.init({ mnemonic: mnemonic1 })
      wallet2 = EIP155Lib.init({ mnemonic: mnemonic2 })
    } else {
      wallet1 = EIP155Lib.init({})
      wallet2 = EIP155Lib.init({})

      // Don't store mnemonic in local storage in a production project!
      localStorage.setItem('EIP155_MNEMONIC_1', wallet1.getMnemonic())
      localStorage.setItem('EIP155_MNEMONIC_2', wallet2.getMnemonic())
    }
  }

  address1 = wallet1.getAddress()
  address2 = wallet2.getAddress()

  eip155Wallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  eip155Addresses = Object.keys(eip155Wallets)

  return {
    eip155Wallets,
    eip155Addresses
  }
}

/**
 * Get wallet for the address in params
 */
export const getWallet = async (params: any) => {
  const eoaWallet = eip155Wallets[getWalletAddressFromParams(eip155Addresses, params)]
  if (eoaWallet) {
    return eoaWallet
  }

  /**
   * Smart accounts
   */
  const chainId = params?.chainId?.split(':')[1]
  console.log('Chain ID', { chainId })
  console.log('PARAMS', { params })

  const address = getWalletAddressFromParams(
    Object.keys(smartAccountWallets)
      .filter(key => {
        const parts = key.split(':')
        return parts[0] === chainId
      })
      .map(key => {
        return key.split(':')[1]
      }),
    params
  )
  if (!address) {
    console.log('Library not initialized for requested address', {
      address,
      values: Object.keys(smartAccountWallets)
    })
    throw new Error('Library not initialized for requested address')
  }
  const lib = smartAccountWallets[`${chainId}:${address}`]
  if (lib) {
    return lib
  }
  console.log('Library not found', {
    target: `${chainId}:address`,
    values: Object.keys(smartAccountWallets)
  })
  throw new Error('Cannot find wallet for requested address')
}
