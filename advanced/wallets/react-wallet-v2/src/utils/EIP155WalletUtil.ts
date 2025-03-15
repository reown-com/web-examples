import EIP155Lib from '@/lib/EIP155Lib'
import { smartAccountWallets } from './SmartAccountUtil'
import { getWalletAddressFromParams } from './HelperUtil'
import { ethers } from 'ethers'

export let wallet1: EIP155Lib
export let wallet2: EIP155Lib
export let eip155Wallets: Record<string, EIP155Lib>
export let eip155Addresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export function createOrRestoreEIP155Wallet() {
  const mnemonic1 = localStorage.getItem('EIP155_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('EIP155_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    if (mnemonic1.includes(' ')) {
      wallet1 = EIP155Lib.init({ mnemonic: mnemonic1 })
    } else {
      wallet1 = EIP155Lib.init({ privateKey: mnemonic1 })
    }
    wallet2 = EIP155Lib.init({ mnemonic: mnemonic2 })
  } else {
    wallet1 = EIP155Lib.init({})
    wallet2 = EIP155Lib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('EIP155_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('EIP155_MNEMONIC_2', wallet2.getMnemonic())
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

export async function replaceEip155Mnemonic(mnemonicOrPrivateKey: string) {
  try {
    let wallet
    if (mnemonicOrPrivateKey.includes(' ')) {
      wallet = EIP155Lib.init({ mnemonic: mnemonicOrPrivateKey })
    } else {
      wallet = EIP155Lib.init({ privateKey: mnemonicOrPrivateKey })
    }
    localStorage.setItem('EIP155_MNEMONIC_1', wallet.getMnemonic())
    location.reload()
  } catch (error) {
    console.error('Failed to replace mnemonic: ', error)
    throw new Error('Invalid mnemonic or private key')
  }
}

export const getWalletByAddress = (address: string) => {
  const checksumAddress = ethers.utils.getAddress(address)
  const wallet = eip155Wallets[checksumAddress]
  console.log('getWalletByAddress', { checksumAddress, wallet, eip155Wallets })
  return wallet
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
