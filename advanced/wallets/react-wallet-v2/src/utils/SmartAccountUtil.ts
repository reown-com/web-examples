import { BiconomySmartAccountLib } from './../lib/smart-accounts/BiconomySmartAccountLib'
import { Hex, Chain as ViemChain } from 'viem'
import { SessionTypes } from '@walletconnect/types'
import { Chain, allowedChains } from '@/consts/smartAccounts'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { baseSepolia, sepolia } from 'viem/chains'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'

// Entrypoints [I think this is constant but JIC]
export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  'Polygon Mumbai': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  Goerli: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  'Base Sepolia': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
}

// Paymasters
// https://docs.pimlico.io/paymaster/erc20-paymaster/contract-addresses
export const PAYMASTER_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x0000000000325602a77416A16136FDafd04b299f',
  'Polygon Mumbai': '0x000000000009B901DeC1aaB9389285965F49D387',
  Goerli: '0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009',
  'Base Sepolia': '0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009' //Dummy
}

// USDC
export const USDC_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'Polygon Mumbai': '0x9999f7fea5938fd3b1e26a12c3f2fb024e194f97',
  Goerli: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
  'Base Sepolia': '0x07865c6e87b9f70255377e024ace6630c1eaa37f' //Dummy
}

// RPC URLs
export const RPC_URLS: Record<ViemChain['name'], string> = {
  Sepolia: 'https://rpc.ankr.com/eth_sepolia',
  'Polygon Mumbai': 'https://mumbai.rpc.thirdweb.com',
  Goerli: 'https://ethereum-goerli.publicnode.com',
  'Base Sepolia': 'https://sepolia.base.org'
}

// Pimlico RPC names
export const PIMLICO_NETWORK_NAMES: Record<ViemChain['name'], string> = {
  Sepolia: 'sepolia',
  'Polygon Mumbai': 'mumbai',
  Goerli: 'goerli',
  'Base Sepolia': 'base-sepolia'
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
  const parsedAllowedChainIds = allowedChainIds.map(chain => chain.replace(`${nameSpaceKey}:`, ''))
  if (parsedAllowedChainIds.length > 0 && smartAccountAddress) {
    const returnVal = parsedAllowedChainIds.map(
      chainId => `${nameSpaceKey}:${chainId}:${smartAccountAddress}`
    )
    return returnVal
  }
  return []
}

export const kernelAllowedChains = [sepolia]
export const safeAllowedChains = [sepolia, baseSepolia]
export const biconomyAllowedChains = [sepolia]

export let smartAccountWallets: Record<string, SmartAccountLib | KernelSmartAccountLib> = {}

export function isAllowedKernelChain(chainId: number): boolean {
  return kernelAllowedChains.some(chain => chain.id == chainId)
}

export async function createOrRestoreKernelSmartAccount(privateKey: string) {
  const lib = new KernelSmartAccountLib({
    privateKey,
    chain: sepolia,
    sponsored: true,
    entryPointVersion: 6
  })
  await lib.init()
  const address = lib.getAddress()
  const key = `${sepolia.id}:${address}`
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

const initializeSafeSmartAccountLib = async (chain: Chain, privateKey: string) => {
  try {
    const lib = new SafeSmartAccountLib({
      privateKey,
      chain,
      sponsored: true,
      entryPointVersion: 7
    })
    await lib.init()
    return lib
  } catch (error) {
    console.error(`Error initializing SafeSmartAccountLib for chain ${chain}:`, error)
    return null // or throw error if you want to stop the entire process
  }
}
export async function createOrRestoreSafeSmartAccount(privateKey: string) {
  if (safeAllowedChains.length === 0) {
    throw new Error('No allowed chains for SafeSmartAccount')
  }

  const libs = await Promise.all(
    safeAllowedChains.map(chain => initializeSafeSmartAccountLib(chain, privateKey))
  ).then(results => results.filter((lib): lib is NonNullable<typeof lib> => lib !== null))

  if (libs.length === 0) {
    throw new Error('No safe smart account initialized')
  }

  libs.forEach(lib => {
    const address = lib.getAddress()
    const key = `${lib.chain.id}:${address}`
    if (!smartAccountWallets[key]) {
      smartAccountWallets[key] = lib
    }
  })

  const safeSmartAccountAddress: string = libs[0].getAddress()

  return {
    safeSmartAccountAddress
  }
}
export function removeSmartAccount(address: string) {
  const key = `${sepolia.id}:${address}`
  if (smartAccountWallets[key]) {
    delete smartAccountWallets[key]
  }
}
export function removeSmartAccounts(addresses: string[]) {
  addresses.forEach(address => {
    if (smartAccountWallets[address]) {
      delete smartAccountWallets[address]
    }
  })
}

export async function createOrRestoreBiconomySmartAccount(privateKey: string) {
  const lib = new BiconomySmartAccountLib({ privateKey, chain: sepolia, sponsored: true })
  await lib.init()
  const address = lib.getAddress()
  const key = `${sepolia.id}:${address}`
  if (!smartAccountWallets[key]) {
    smartAccountWallets[key] = lib
  }
  return {
    biconomySmartAccountAddress: address
  }
}

export type UrlConfig = {
  chain: Chain | ViemChain
}

export const publicClientUrl = ({ chain }: UrlConfig) => {
  return process.env.NEXT_PUBLIC_LOCAL_CLIENT_URL || publicRPCUrl({ chain })
}

export const paymasterUrl = ({ chain }: UrlConfig) => {
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
  if (apiKey == null) {
    throw new Error('Pimlico API Key not set')
  }

  const localPaymasterUrl = process.env.NEXT_PUBLIC_LOCAL_PAYMASTER_URL
  if (localPaymasterUrl) {
    return localPaymasterUrl
  }
  return `https://api.pimlico.io/v2/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
}

export const bundlerUrl = ({ chain }: UrlConfig) => {
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
  if (apiKey == null) {
    throw new Error('Pimlico API Key not set')
  }
  const localBundlerUrl = process.env.NEXT_PUBLIC_LOCAL_BUNDLER_URL
  if (localBundlerUrl) {
    return localBundlerUrl
  }
  return `https://api.pimlico.io/v1/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
}
