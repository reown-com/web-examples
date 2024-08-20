import { KernelSmartAccountLib } from '@/lib/smart-accounts/KernelSmartAccountLib'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'
import { getAddress } from 'viem'
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

export const SAFE_FALLBACK_HANDLER_STORAGE_SLOT =
  '0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5'

export const SAFE_4337_MODULE_ADDRESSES = [
  getAddress('0xa581c4A4DB7175302464fF3C06380BC3270b4037'),
  getAddress('0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226'),
  getAddress('0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2')
]
