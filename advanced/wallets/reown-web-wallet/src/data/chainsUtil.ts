import { EIP155_CHAINS } from './EIP155Data'

export const ALL_CHAINS = {
  ...EIP155_CHAINS,
}

export function getChainData(chainId?: string) {
  if (!chainId) return
  const [namespace, reference] = chainId.toString().split(':')
  return Object.values(ALL_CHAINS).find(
    chain => String(chain.chainId) === reference && chain.namespace === namespace
  )
}
