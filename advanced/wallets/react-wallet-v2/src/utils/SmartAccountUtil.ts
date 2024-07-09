import { BiconomySmartAccountLib } from './../lib/smart-accounts/BiconomySmartAccountLib'
import { Hex } from 'viem'
import { SessionTypes } from '@walletconnect/types'
import { Chain, allowedChains } from '@/consts/smartAccounts'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { foundry, sepolia } from 'viem/chains'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'

export type UrlConfig = {
  chain: Chain
}

// Entrypoints [I think this is constant but JIC]
export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  'Polygon Mumbai': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  Goerli: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  Foundry: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
}

// Paymasters
// https://docs.pimlico.io/paymaster/erc20-paymaster/contract-addresses
export const PAYMASTER_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x0000000000325602a77416A16136FDafd04b299f',
  'Polygon Mumbai': '0x000000000009B901DeC1aaB9389285965F49D387',
  Goerli: '0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009',
  Foundry: '0x0000000000325602a77416A16136FDafd04b299f'
}

// USDC
export const USDC_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'Polygon Mumbai': '0x9999f7fea5938fd3b1e26a12c3f2fb024e194f97',
  Goerli: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
  Foundry: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
}

// RPC URLs
export const RPC_URLS: Record<Chain['name'], string> = {
  Sepolia: 'https://rpc.ankr.com/eth_sepolia',
  'Polygon Mumbai': 'https://mumbai.rpc.thirdweb.com',
  Goerli: 'https://ethereum-goerli.publicnode.com',
  Foundry: 'http://localhost:8545'
}

// Pimlico RPC names
export const PIMLICO_NETWORK_NAMES: Record<Chain['name'], string> = {
  Sepolia: 'sepolia',
  'Polygon Mumbai': 'mumbai',
  Goerli: 'goerli',
  Foundry: 'foundry'
}

export const publicRPCUrl = ({ chain }: UrlConfig) => {
  return RPC_URLS[chain?.name]
}

export function supportedAddressPriority(
  namespaces: SessionTypes.Namespaces,
  smartAccountAddress: string,
  providedAllowedChains: Partial<typeof allowedChains>
) {
  const namespaceKeys = Object.keys(namespaces)
  const [nameSpaceKey] = namespaceKeys
  // get chain ids from namespaces
  const [chainIds] = namespaceKeys.map(key => namespaces[key].chains)
  if (!chainIds) {
    return []
  }
  const allowedChainIds = chainIds.filter(id => {
    const chainId = id.replace(`${nameSpaceKey}:`, '')
    return providedAllowedChains.map(chain => chain?.id.toString()).includes(chainId)
  })
  if (allowedChainIds.length === 0) return []
  const chainIdParsed = allowedChainIds[0].replace(`${nameSpaceKey}:`, '')
  const chain = providedAllowedChains.find(chain => chain?.id.toString() === chainIdParsed)!
  if (allowedChainIds.length > 0 && smartAccountAddress) {
    return [`${nameSpaceKey}:${chain.id}:${smartAccountAddress}`]
  }
  return []
}

export const kernelAllowedChains = [sepolia, foundry]
export const safeAllowedChains = [sepolia, foundry]
export const biconomyAllowedChains = [sepolia, foundry]

export let smartAccountWallets: Record<string, SmartAccountLib | KernelSmartAccountLib> = {}

export function isAllowedKernelChain(chainId: number): boolean {
  return kernelAllowedChains.some(chain => chain.id == chainId)
}

export async function createOrRestoreKernelSmartAccount(
  privateKey: string,
  chain: Chain = sepolia
) {
  const lib = new KernelSmartAccountLib({
    privateKey,
    chain: chain,
    sponsored: true,
    entryPointVersion: 6
  })
  await lib.init()
  const address = lib.getAddress()
  const key = `${chain.id}:${address}`
  if (!smartAccountWallets[key]) {
    smartAccountWallets[key] = lib
  }
  return {
    kernelSmartAccountAddress: address
  }
}

export function isAllowedSafeChain(chainId: number): boolean {
  return safeAllowedChains.some(chain => chain.id == chainId)
}

export async function createOrRestoreSafeSmartAccount(privateKey: string, chain: Chain = sepolia) {
  const lib = new SafeSmartAccountLib({
    privateKey,
    chain: chain,
    sponsored: true,
    entryPointVersion: 7
  })
  await lib.init()
  const address = lib.getAddress()
  const key = `${chain.id}:${address}`
  if (!smartAccountWallets[key]) {
    smartAccountWallets[key] = lib
  }
  return {
    safeSmartAccountAddress: address
  }
}
export function removeSmartAccount(address: string, chain: Chain = sepolia) {
  const key = `${chain.id}:${address}`
  if (smartAccountWallets[key]) {
    delete smartAccountWallets[key]
  }
}

export async function createOrRestoreBiconomySmartAccount(
  privateKey: string,
  chain: Chain = sepolia
) {
  const lib = new BiconomySmartAccountLib({ privateKey, chain: chain, sponsored: true })
  await lib.init()
  const address = lib.getAddress()
  const key = `${chain.id}:${address}`
  if (!smartAccountWallets[key]) {
    smartAccountWallets[key] = lib
  }
  return {
    biconomySmartAccountAddress: address
  }
}
