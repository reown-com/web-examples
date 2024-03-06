import { KernelSmartAccountLib } from "@/lib/KernelSmartAccountLib"
import { sepolia } from "viem/chains"

// Types
export const allowedChains = [sepolia] as const
export const chains = allowedChains.reduce((acc, chain) => {
    acc[chain.id] = chain
    return acc
  }, {} as Record<Chain['id'], Chain>)
  export type Chain = (typeof allowedChains)[number]


/**
 * Utilities
 */

export function isAllowedKernelChain(chainId: number): boolean {
  console.log('Checking isAllowedKernelChain',{allowedChains, chainId});
  
   return allowedChains.some(chain => chain.id == chainId)
}


export async function createOrRestoreKernelSmartAccount(privateKey: string){
    const lib = new KernelSmartAccountLib({privateKey, chain: sepolia })
    await lib.init()
    return {
      kernelSmartAccountAddress: lib.getAddress()
    }
  }