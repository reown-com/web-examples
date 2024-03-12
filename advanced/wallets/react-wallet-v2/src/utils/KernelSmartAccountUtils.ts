import { KernelSmartAccountLib } from "@/lib/KernelSmartAccountLib"
import { sepolia } from "viem/chains"
import { SessionTypes } from '@walletconnect/types';
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
export function kernelAddressPriority(namespaces: SessionTypes.Namespaces, kernelSmartAccountAddress: string){
  const namespaceKeys = Object.keys(namespaces)
  const [nameSpaceKey] = namespaceKeys
   // get chain ids from namespaces
  const [chainIds] = namespaceKeys.map(key => namespaces[key].chains)
  if (!chainIds) {
    return []
  }
  const allowedChainIds = chainIds.filter(id => {
    const chainId = id.replace(`${nameSpaceKey}:`, '')
    return allowedChains.map(chain => chain.id.toString()).includes(chainId)
  })
  const chainIdParsed = allowedChainIds[0].replace(`${nameSpaceKey}:`, '')
  const chain = allowedChains.find(chain => chain.id.toString() === chainIdParsed)!
  if (allowedChainIds.length > 0 && kernelSmartAccountAddress) {
    const allowedAccounts = allowedChainIds.map(id => {
      // check if id is a part of any of these array elements namespaces.eip155.accounts
      const accountIsAllowed = namespaces.eip155.accounts.findIndex(account =>
        account.includes(id)
      )
      return namespaces.eip155.accounts[accountIsAllowed]
    })
    return [
      `${nameSpaceKey}:${chain.id}:${kernelSmartAccountAddress}`,
      ...allowedAccounts
    ]
  }
  return []
}

