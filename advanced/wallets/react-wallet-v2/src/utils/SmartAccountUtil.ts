import { BiconomySmartAccountLib } from './../lib/smart-accounts/BiconomySmartAccountLib'
import { Hex } from 'viem'
import { SessionTypes } from '@walletconnect/types'
import { Chain, allowedChains } from '@/consts/smartAccounts'
import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { sepolia } from 'viem/chains'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { SmartAccountLib } from '@/lib/smart-accounts/SmartAccountLib'

export type UrlConfig = {
  chain: Chain
}

// Entrypoints [I think this is constant but JIC]
export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  'Polygon Mumbai': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  Goerli: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
}

// Paymasters
// https://docs.pimlico.io/paymaster/erc20-paymaster/contract-addresses
export const PAYMASTER_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x0000000000325602a77416A16136FDafd04b299f',
  'Polygon Mumbai': '0x000000000009B901DeC1aaB9389285965F49D387',
  Goerli: '0xEc43912D8C772A0Eba5a27ea5804Ba14ab502009'
}

// USDC
export const USDC_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'Polygon Mumbai': '0x9999f7fea5938fd3b1e26a12c3f2fb024e194f97',
  Goerli: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
}

// RPC URLs
export const RPC_URLS: Record<Chain['name'], string> = {
  Sepolia: 'https://rpc.ankr.com/eth_sepolia',
  'Polygon Mumbai': 'https://mumbai.rpc.thirdweb.com',
  Goerli: 'https://ethereum-goerli.publicnode.com'
}

// Pimlico RPC names
export const PIMLICO_NETWORK_NAMES: Record<Chain['name'], string> = {
  Sepolia: 'sepolia',
  'Polygon Mumbai': 'mumbai',
  Goerli: 'goerli'
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
    const allowedAccounts = allowedChainIds.map(id => {
      // check if id is a part of any of these array elements namespaces.eip155.accounts
      const accountIsAllowed = namespaces.eip155.accounts.findIndex(account => account.includes(id))
      return namespaces.eip155.accounts[accountIsAllowed]
    })
    return [`${nameSpaceKey}:${chain.id}:${smartAccountAddress}`, ...allowedAccounts]
  }
  return []
}

export const kernelAllowedChains = [sepolia]
export const safeAllowedChains = [sepolia]
export const biconomyAllowedChains = [sepolia]

export let smartAccountWallets: Record<string, SmartAccountLib | KernelSmartAccountLib> = {}

export function isAllowedKernelChain(chainId: number): boolean {
  return kernelAllowedChains.some(chain => chain.id == chainId)
}

export async function createOrRestoreKernelSmartAccount(privateKey: string) {
  const lib = new KernelSmartAccountLib({ privateKey, chain: sepolia, sponsored: true })
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

export async function createOrRestoreSafeSmartAccount(privateKey: string) {
  const lib = new SafeSmartAccountLib({ privateKey, chain: sepolia, sponsored: true })
  await lib.init()
  const address = lib.getAddress()
  const key = `${sepolia.id}:${address}`
  if (!smartAccountWallets[key]) {
    smartAccountWallets[key] = lib
  }
  return {
    safeSmartAccountAddress: address
  }
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
