/**
 * WDK key-handling layer.
 *
 * A single BIP-39 seed phrase backs all three chains. Tether WDK derives the
 * keys for each network (BIP-44 for EVM/TON, SLIP-0010 for Solana) and gives us
 * a uniform account API for addresses and signing.
 *
 * The seed phrase is persisted in localStorage purely so the demo wallet keeps
 * the same accounts across reloads. Never persist a seed phrase like this in a
 * real wallet.
 */
import WalletManagerEvm, { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'
import WalletManagerSolana, { WalletAccountSolana } from '@tetherto/wdk-wallet-solana'
import WalletManagerTon, { WalletAccountTon } from '@tetherto/wdk-wallet-ton'
import { DEFAULT_SOLANA_RPC, DEFAULT_TON_RPC, EVM_CHAINS } from '@/config/chains'

const SEED_STORAGE_KEY = 'WDK_SEED_PHRASE'

export interface LoadedAccounts {
  seedPhrase: string
  evm: string
  solana: string
  ton: string
}

let seedPhrase: string | undefined
let solanaManager: WalletManagerSolana | undefined
let tonManager: WalletManagerTon | undefined

export function getSeedPhrase(): string {
  if (!seedPhrase) throw new Error('WDK wallet not initialized')
  return seedPhrase
}

function loadOrCreateSeedPhrase(): string {
  if (typeof window === 'undefined') {
    return WalletManagerEvm.getRandomSeedPhrase(24)
  }
  const stored = localStorage.getItem(SEED_STORAGE_KEY)
  if (stored && WalletManagerEvm.isValidSeedPhrase(stored)) {
    return stored
  }
  const fresh = WalletManagerEvm.getRandomSeedPhrase(24)
  // Demo-only persistence — do not do this in production.
  localStorage.setItem(SEED_STORAGE_KEY, fresh)
  return fresh
}

/**
 * Loads (or creates) the wallet's seed phrase and derives the first account on
 * each supported chain. Returns the public addresses for display.
 */
export async function loadOrCreateAccounts(): Promise<LoadedAccounts> {
  seedPhrase = loadOrCreateSeedPhrase()

  const evmManager = new WalletManagerEvm(seedPhrase)
  solanaManager = new WalletManagerSolana(seedPhrase, { provider: DEFAULT_SOLANA_RPC })
  tonManager = new WalletManagerTon(seedPhrase, { tonClient: { url: DEFAULT_TON_RPC } })

  const [evmAccount, solanaAccount, tonAccount] = await Promise.all([
    evmManager.getAccount(0),
    solanaManager.getAccount(0),
    tonManager.getAccount(0)
  ])

  const [evm, solana, ton] = await Promise.all([
    evmAccount.getAddress(),
    solanaAccount.getAddress(),
    tonAccount.getAddress()
  ])

  return { seedPhrase, evm, solana, ton }
}

/**
 * Returns an EVM account bound to the RPC + chainId of the requested chain, so
 * that signTransaction / sendTransaction target the correct network.
 */
export async function getEvmAccount(caip2: string): Promise<WalletAccountEvm> {
  const chain = EVM_CHAINS[caip2]
  if (!chain) throw new Error(`Unsupported EVM chain: ${caip2}`)
  const manager = new WalletManagerEvm(getSeedPhrase(), {
    provider: chain.rpc,
    chainId: chain.chainId
  })
  return manager.getAccount(0)
}

/**
 * An EVM account with no provider, for operations that don't touch the network
 * (e.g. signing EIP-712 typed data for the WalletConnect Pay flow).
 */
export async function getEvmSigningAccount(): Promise<WalletAccountEvm> {
  const manager = new WalletManagerEvm(getSeedPhrase())
  return manager.getAccount(0)
}

export async function getSolanaAccount(): Promise<WalletAccountSolana> {
  if (!solanaManager) throw new Error('Solana wallet not initialized')
  return solanaManager.getAccount(0)
}

export async function getTonAccount(): Promise<WalletAccountTon> {
  if (!tonManager) throw new Error('TON wallet not initialized')
  return tonManager.getAccount(0)
}
