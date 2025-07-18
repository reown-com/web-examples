import { BIP122_CHAINS } from './Bip122Data'
import * as viemChains from 'viem/chains'
import { COSMOS_MAINNET_CHAINS } from './COSMOSData'
import { EIP155_CHAINS } from './EIP155Data'
import { KADENA_CHAINS } from './KadenaData'
import { MULTIVERSX_CHAINS } from './MultiversxData'
import { NEAR_CHAINS } from './NEARData'
import { POLKADOT_CHAINS } from './PolkadotData'
import { SOLANA_CHAINS } from './SolanaData'
import { TEZOS_CHAINS } from './TezosData'
import { TRON_CHAINS } from './TronData'
import { SUI_CHAINS } from './SuiData'
import { STACKS_CHAINS } from './StacksData'

export const ALL_CHAINS = {
  ...EIP155_CHAINS,
  ...COSMOS_MAINNET_CHAINS,
  ...KADENA_CHAINS,
  ...MULTIVERSX_CHAINS,
  ...NEAR_CHAINS,
  ...POLKADOT_CHAINS,
  ...SOLANA_CHAINS,
  ...TEZOS_CHAINS,
  ...TRON_CHAINS,
  ...BIP122_CHAINS,
  ...SUI_CHAINS,
  ...STACKS_CHAINS
}

export function getChainData(chainId?: string) {
  if (!chainId) return
  const [namespace, reference] = chainId.toString().split(':')
  return Object.values(ALL_CHAINS).find(
    chain => chain.chainId == reference && chain.namespace === namespace
  )
}

export function getViemChain(id: number) {
  const chains = Object.values(viemChains) as viemChains.Chain[]

  return chains.find(x => x.id === id)
}
