import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { goerli, polygonMumbai, sepolia } from 'viem/chains'

// Types
export const allowedChains = [sepolia, polygonMumbai, goerli]
// build chains so I can access them by id
export const chains = allowedChains.reduce((acc, chain) => {
  acc[chain.id] = chain
  return acc
}, {} as Record<Chain['id'], Chain>)
export type Chain = typeof allowedChains[number]

export const availableSmartAccounts = {
  safe: SafeSmartAccountLib,
  kernel: KernelSmartAccountLib
}
