import { buildApprovedNamespaces } from '@walletconnect/utils'
import { ProposalTypes, SessionTypes } from '@walletconnect/types'
import {
  EVM_CHAINS,
  EVM_SIGNING_METHODS,
  SOLANA_CHAINS,
  SOLANA_SIGNING_METHODS,
  TON_CHAINS,
  TON_SIGNING_METHODS
} from '@/config/chains'
import { LoadedAccounts } from '@/lib/WDKWallet'

/**
 * Builds the session namespaces we are willing to approve from a proposal.
 *
 * `buildApprovedNamespaces` intersects the dApp's required/optional namespaces
 * with what we support here and throws if a required chain/method is missing.
 */
export function buildNamespaces(
  proposal: ProposalTypes.Struct,
  accounts: LoadedAccounts
): SessionTypes.Namespaces {
  const evmChains = Object.keys(EVM_CHAINS)
  const solanaChains = Object.keys(SOLANA_CHAINS)
  const tonChains = Object.keys(TON_CHAINS)

  return buildApprovedNamespaces({
    proposal,
    supportedNamespaces: {
      eip155: {
        chains: evmChains,
        methods: Object.values(EVM_SIGNING_METHODS),
        events: ['accountsChanged', 'chainChanged'],
        accounts: evmChains.map(chain => `${chain}:${accounts.evm}`)
      },
      solana: {
        chains: solanaChains,
        methods: Object.values(SOLANA_SIGNING_METHODS),
        events: [],
        accounts: solanaChains.map(chain => `${chain}:${accounts.solana}`)
      },
      ton: {
        chains: tonChains,
        methods: Object.values(TON_SIGNING_METHODS),
        events: [],
        accounts: tonChains.map(chain => `${chain}:${accounts.ton}`)
      }
    }
  })
}
