import { ProposalTypes } from '@walletconnect/types'
import {
  COSMOS_SIGNING_METHODS,
  EIP155_SIGNING_METHODS,
  SOLANA_SIGNING_METHODS,
  POLKADOT_SIGNING_METHODS,
  NEAR_SIGNING_METHODS,
  ELROND_SIGNING_METHODS,
  TRON_SIGNING_METHODS,
  EIP_155_EVENTS,
  COSMOS_EVENTS,
  SOLANA_EVENTS,
  POLKADOT_EVENTS,
  NEAR_EVENTS,
  ELROND_EVENTS,
  TRON_EVENTS,
  COSMOS_MAINNET_CHAINS,
  EIP155_CHAINS,
  SOLANA_CHAINS,
  POLKADOT_MAINNET_CHAINS,
  NEAR_CHAINS,
  ELROND_CHAINS,
  TRON_CHAINS
} from '../data'

export const getNamespacesFromChains = (chains: string[]) => {
  const supportedNamespaces: string[] = []
  chains.forEach(chainId => {
    const [namespace] = chainId.split(':')
    if (!supportedNamespaces.includes(namespace)) {
      supportedNamespaces.push(namespace)
    }
  })

  return supportedNamespaces
}

export const getSupportedMethodsByNamespace = (namespace: string) => {
  switch (namespace) {
    case 'eip155':
      return Object.values(EIP155_SIGNING_METHODS)
    case 'cosmos':
      return Object.values(COSMOS_SIGNING_METHODS)
    case 'solana':
      return Object.values(SOLANA_SIGNING_METHODS)
    case 'polkadot':
      return Object.values(POLKADOT_SIGNING_METHODS)
    case 'near':
      return Object.values(NEAR_SIGNING_METHODS)
    case 'elrond':
      return Object.values(ELROND_SIGNING_METHODS)
    case 'tron':
      return Object.values(TRON_SIGNING_METHODS)
    default:
      throw new Error(`No default methods for namespace: ${namespace}`)
  }
}

export const getSupportedEventsByNamespace = (namespace: string) => {
  switch (namespace) {
    case 'eip155':
      return Object.values(EIP_155_EVENTS)
    case 'cosmos':
      return Object.values(COSMOS_EVENTS)
    case 'solana':
      return Object.values(SOLANA_EVENTS)
    case 'polkadot':
      return Object.values(POLKADOT_EVENTS)
    case 'near':
      return Object.values(NEAR_EVENTS)
    case 'elrond':
      return Object.values(ELROND_EVENTS)
    case 'tron':
      return Object.values(TRON_EVENTS)
    default:
      throw new Error(`No default events for namespace: ${namespace}`)
  }
}

export const getSupportedNamespacesFromChains = (
  chains: string[]
): ProposalTypes.RequiredNamespaces => {
  const selectedNamespaces = getNamespacesFromChains(chains)
  console.log('selected namespaces:', selectedNamespaces)

  return Object.fromEntries(
    selectedNamespaces.map(namespace => [
      namespace,
      {
        methods: getSupportedMethodsByNamespace(namespace),
        chains: chains.filter(chain => chain.startsWith(namespace)),
        events: getSupportedEventsByNamespace(namespace) as any[]
      }
    ])
  )
}

export const getSupportedNamespaces = () => {
  const supportedChains = [
    Object.keys(COSMOS_MAINNET_CHAINS),
    Object.keys(EIP155_CHAINS),
    Object.keys(SOLANA_CHAINS),
    Object.keys(POLKADOT_MAINNET_CHAINS),
    Object.keys(NEAR_CHAINS),
    Object.keys(ELROND_CHAINS),
    Object.keys(TRON_CHAINS)
  ].flat() as string[]
  return getSupportedNamespacesFromChains(supportedChains)
}
