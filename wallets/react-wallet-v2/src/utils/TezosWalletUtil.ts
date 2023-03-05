import TezosLib from '@/lib/TezosLib'

export let wallet1: TezosLib
export let wallet2: TezosLib
export let tezosWallets: Record<string, TezosLib>
export let tezosAddresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export function getTezosWallet(address: string) {
  let wallet = Object.entries(tezosWallets).find(([walletAddress, _]) => {
    return address === walletAddress
  })
  return wallet?.[1]
}

export async function createOrRestoreTezosWallet() {
  const mnemonic1 = localStorage.getItem('TEZOS_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('TEZOS_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    wallet1 = await TezosLib.init({ mnemonic: mnemonic1 })
    wallet2 = await TezosLib.init({ mnemonic: mnemonic2 })
  } else {
    wallet1 = await TezosLib.init({})
    wallet2 = await TezosLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('TEZOS_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('TEZOS_MNEMONIC_2', wallet2.getMnemonic())
  }

  address1 = wallet1.getAddress()
  address2 = wallet2.getAddress()

  tezosWallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  tezosAddresses = Object.keys(tezosWallets)

  return {
    tezosWallets,
    tezosAddresses
  }
}
