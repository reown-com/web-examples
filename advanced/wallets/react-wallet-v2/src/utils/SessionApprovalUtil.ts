/**
 * Shared session-approval logic for the Session Fees + Dapp Picker POCs.
 *
 * Both the interactive SessionProposalModal and the picker auto-approve path
 * must build the SAME approved namespaces and attach the SAME `wc_feeTerms`
 * session properties. The mobile POC duplicated this and flagged it as a corner
 * cut — here it lives in one place:
 *   - getSupportedNamespaces()  — the wallet's full namespace capability set
 *   - buildSessionProperties()  — per-namespace props + wc_feeTerms
 *   - autoApproveSessionProposal() — headless approve for picker pairings
 */
import { buildApprovedNamespaces } from '@walletconnect/utils'
import { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { walletkit } from '@/utils/WalletConnectUtil'
import SettingsStore from '@/store/SettingsStore'

import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { EIP5792_METHODS } from '@/data/EIP5792Data'
import { EIP7715_METHOD } from '@/data/EIP7715Data'
import { COSMOS_MAINNET_CHAINS, COSMOS_SIGNING_METHODS } from '@/data/COSMOSData'
import { KADENA_CHAINS, KADENA_SIGNING_METHODS } from '@/data/KadenaData'
import { MULTIVERSX_CHAINS, MULTIVERSX_SIGNING_METHODS } from '@/data/MultiversxData'
import { NEAR_CHAINS, NEAR_SIGNING_METHODS } from '@/data/NEARData'
import { POLKADOT_CHAINS, POLKADOT_SIGNING_METHODS } from '@/data/PolkadotData'
import { SOLANA_CHAINS, SOLANA_SIGNING_METHODS } from '@/data/SolanaData'
import { TEZOS_CHAINS, TEZOS_SIGNING_METHODS } from '@/data/TezosData'
import { TRON_CHAINS, TRON_SIGNING_METHODS } from '@/data/TronData'
import { BIP122_CHAINS, BIP122_EVENTS, BIP122_SIGNING_METHODS, IBip122ChainId } from '@/data/Bip122Data'
import { SUI_CHAINS, SUI_EVENTS, SUI_SIGNING_METHODS } from '@/data/SuiData'
import { STACKS_CHAINS, STACKS_EVENTS, STACKS_SIGNING_METHODS } from '@/data/StacksData'
import { TON_CHAINS, TON_SIGNING_METHODS } from '@/data/TonData'
import { CANTON_CHAINS, CANTON_SIGNING_METHODS, CANTON_EVENTS } from '@/data/CantonData'

import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { kadenaAddresses } from '@/utils/KadenaWalletUtil'
import { multiversxAddresses } from '@/utils/MultiversxWalletUtil'
import { nearAddresses } from '@/utils/NearWalletUtil'
import { polkadotAddresses } from '@/utils/PolkadotWalletUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { tezosAddresses } from '@/utils/TezosWalletUtil'
import { tronAddresses } from '@/utils/TronWalletUtil'
import { bip122Addresses, bip122Wallet } from '@/utils/Bip122WalletUtil'
import { suiAddresses, getWallet as getSuiWallet } from '@/utils/SuiWalletUtil'
import { stacksAddresses, stacksWallet } from '@/utils/StacksWalletUtil'
import { getWallet as getTonWallet, tonAddresses } from '@/utils/TonWalletUtil'
import { cantonAddresses } from '@/utils/CantonWalletUtil'
import { getWalletCapabilities } from '@/utils/EIP5792WalletUtil'

/**
 * The wallet's full namespace capability set, used to build approved namespaces
 * from any proposal. `addressesToApprove` caps how many EIP155 accounts are
 * offered (used by the modal's ?addressesToApprove= test hook).
 */
export function getSupportedNamespaces(addressesToApprove?: number | null) {
  const eip155Chains = Object.keys(EIP155_CHAINS)
  const eip155Methods = Object.values(EIP155_SIGNING_METHODS)
  const eip5792Methods = Object.values(EIP5792_METHODS)
  const eip7715Methods = Object.values(EIP7715_METHOD)

  const cosmosChains = Object.keys(COSMOS_MAINNET_CHAINS)
  const cosmosMethods = Object.values(COSMOS_SIGNING_METHODS)

  const kadenaChains = Object.keys(KADENA_CHAINS)
  const kadenaMethods = Object.values(KADENA_SIGNING_METHODS)

  const multiversxChains = Object.keys(MULTIVERSX_CHAINS)
  const multiversxMethods = Object.values(MULTIVERSX_SIGNING_METHODS)

  const nearChains = Object.keys(NEAR_CHAINS)
  const nearMethods = Object.values(NEAR_SIGNING_METHODS)

  const polkadotChains = Object.keys(POLKADOT_CHAINS)
  const polkadotMethods = Object.values(POLKADOT_SIGNING_METHODS)

  const solanaChains = Object.keys(SOLANA_CHAINS)
  const solanaMethods = Object.values(SOLANA_SIGNING_METHODS)

  const tezosChains = Object.keys(TEZOS_CHAINS)
  const tezosMethods = Object.values(TEZOS_SIGNING_METHODS)

  const tronChains = Object.keys(TRON_CHAINS)
  const tronMethods = Object.values(TRON_SIGNING_METHODS)

  const bip122Chains = Object.keys(BIP122_CHAINS)
  const bip122Methods = Object.values(BIP122_SIGNING_METHODS)
  const bip122Events = Object.values(BIP122_EVENTS)

  const suiChains = Object.keys(SUI_CHAINS)
  const suiMethods = Object.values(SUI_SIGNING_METHODS)
  const suiEvents = Object.values(SUI_EVENTS)

  const stacksChains = Object.keys(STACKS_CHAINS)
  const stacksMethods = Object.values(STACKS_SIGNING_METHODS)
  const stacksEvents = Object.values(STACKS_EVENTS)

  const tonChains = Object.keys(TON_CHAINS)
  const tonMethods = Object.values(TON_SIGNING_METHODS)
  const tonEvents = [] as string[]

  const cantonChains = Object.keys(CANTON_CHAINS)
  const cantonMethods = Object.values(CANTON_SIGNING_METHODS)
  const cantonEvents = Object.values(CANTON_EVENTS)

  return {
    eip155: {
      chains: eip155Chains,
      methods: eip155Methods.concat(eip5792Methods).concat(eip7715Methods),
      events: ['accountsChanged', 'chainChanged'],
      accounts: eip155Chains
        .map(chain =>
          eip155Addresses
            .map(account => `${chain}:${account}`)
            .slice(0, addressesToApprove ?? eip155Addresses.length)
        )
        .flat()
    },
    cosmos: {
      chains: cosmosChains,
      methods: cosmosMethods,
      events: [],
      accounts: cosmosChains.map(chain => cosmosAddresses.map(address => `${chain}:${address}`)).flat()
    },
    kadena: {
      chains: kadenaChains,
      methods: kadenaMethods,
      events: [],
      accounts: kadenaChains.map(chain => kadenaAddresses.map(address => `${chain}:${address}`)).flat()
    },
    mvx: {
      chains: multiversxChains,
      methods: multiversxMethods,
      events: [],
      accounts: multiversxChains
        .map(chain => multiversxAddresses.map(address => `${chain}:${address}`))
        .flat()
    },
    near: {
      chains: nearChains,
      methods: nearMethods,
      events: ['accountsChanged', 'chainChanged'],
      accounts: nearChains.map(chain => nearAddresses.map(address => `${chain}:${address}`)).flat()
    },
    polkadot: {
      chains: polkadotChains,
      methods: polkadotMethods,
      events: [],
      accounts: polkadotChains
        .map(chain => polkadotAddresses.map(address => `${chain}:${address}`))
        .flat()
    },
    solana: {
      chains: solanaChains,
      methods: solanaMethods,
      events: [],
      accounts: solanaChains.map(chain => solanaAddresses.map(address => `${chain}:${address}`)).flat()
    },
    tezos: {
      chains: tezosChains,
      methods: tezosMethods,
      events: [],
      accounts: tezosChains.map(chain => tezosAddresses.map(address => `${chain}:${address}`)).flat()
    },
    tron: {
      chains: tronChains,
      methods: tronMethods,
      events: [],
      accounts:
        tronChains.map(chain => tronAddresses?.map(address => `${chain}:${address}`)).flat() || []
    },
    bip122: {
      chains: bip122Chains,
      methods: bip122Methods,
      events: bip122Events,
      accounts: bip122Addresses
    },
    sui: {
      chains: suiChains,
      methods: suiMethods,
      events: suiEvents,
      accounts: suiChains.map(chain => suiAddresses.map(address => `${chain}:${address}`)).flat()
    },
    stacks: {
      chains: stacksChains,
      methods: stacksMethods,
      events: stacksEvents,
      accounts: stacksAddresses
    },
    ton: {
      chains: tonChains,
      methods: tonMethods,
      events: tonEvents,
      accounts: tonChains.map(chain => (tonAddresses || []).map(address => `${chain}:${address}`)).flat()
    },
    canton: {
      chains: cantonChains,
      methods: cantonMethods,
      events: cantonEvents,
      accounts: cantonChains
        .map(chain => (cantonAddresses || []).map(address => `${chain}:${address}`))
        .flat()
    }
  }
}

/**
 * Read the wallet's fee terms (Session Fees POC) as a JSON string suitable for
 * sessionProperties.wc_feeTerms — or undefined if no recipient is configured.
 * feeRecipient (Solana) is a hardcoded demo address; feeRecipientEip155 defaults
 * to the wallet's second EVM account.
 */
export function buildFeeTerms(): string | undefined {
  const feeRecipient =
    process.env.NEXT_PUBLIC_FEE_RECIPIENT || '9zYtGz2nuUMe8yb9EJNNWdh2MNgMjAoWFuNgzjDm2nua'
  const feeRecipientEip155 =
    process.env.NEXT_PUBLIC_FEE_RECIPIENT_EVM || eip155Addresses[1] || eip155Addresses[0]
  if (!feeRecipient) return undefined
  return JSON.stringify({
    version: 1,
    feeRecipient,
    feeRecipientEip155,
    feeBps: Number(process.env.NEXT_PUBLIC_FEE_BPS || 50)
  })
}

/**
 * Build the sessionProperties for an approval: EIP-5792 capabilities, the
 * per-namespace extras each chain needs, and the Session Fees `wc_feeTerms`.
 * `capabilitiesAccounts` are the EIP155 accounts to advertise capabilities for
 * (the modal passes its priority-reordered accounts; auto-approve passes the
 * approved eip155 accounts).
 */
export async function buildSessionProperties(
  namespaces: SessionTypes.Namespaces,
  opts: { capabilitiesAccounts: string[] }
): Promise<Record<string, string>> {
  const capabilities = getWalletCapabilities(opts.capabilitiesAccounts)
  const sessionProperties: Record<string, string> = {
    capabilities: JSON.stringify(capabilities)
  }

  if (namespaces.tron) {
    sessionProperties['tron_method_version'] = 'v1'
  }

  if (namespaces.bip122) {
    const bip122Chain = namespaces.bip122.chains?.[0]!
    sessionProperties.bip122_getAccountAddresses = JSON.stringify({
      payment: Array.from(bip122Wallet.getAddresses(bip122Chain as IBip122ChainId).values()),
      ordinal: Array.from(
        bip122Wallet.getAddresses(bip122Chain as IBip122ChainId, ['ordinal']).values()
      )
    })
  }

  if (namespaces.sui) {
    const suiWallet = await getSuiWallet()
    const accounts = suiWallet.getAccounts()
    sessionProperties.sui_getAccounts = JSON.stringify(accounts)
  }

  if (namespaces.stacks) {
    const accounts = stacksWallet.getAccounts()
    sessionProperties.stacks_getAddresses = JSON.stringify([accounts.mainnet, accounts.testnet])
  }

  if (namespaces.ton) {
    const tonWallet = await getTonWallet()
    sessionProperties.ton_getPublicKey = tonWallet.getPublicKey()
    sessionProperties.ton_getStateInit = tonWallet.getStateInit()
  }

  // Session Fees POC: declare the wallet's fee terms so the dapp applies them
  // as an integrator fee when building swaps via an aggregator.
  const feeTerms = buildFeeTerms()
  if (feeTerms) {
    sessionProperties.wc_feeTerms = feeTerms
  }

  return sessionProperties
}

/**
 * Dapp Picker POC: approve a proposal with no UI, full namespaces, and fee
 * terms. Used only for pairings the wallet itself initiated from an Explore
 * tile (gated by consent + origin check in the caller). Throws on any failure
 * so the caller can fall back to the interactive modal.
 */
export async function autoApproveSessionProposal(
  proposal: SignClientTypes.EventArguments['session_proposal']
): Promise<SessionTypes.Struct> {
  const supportedNamespaces = getSupportedNamespaces()
  const namespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces
  })
  const sessionProperties = await buildSessionProperties(namespaces, {
    capabilitiesAccounts: namespaces.eip155?.accounts ?? []
  })

  const session = await walletkit.approveSession({
    id: proposal.id,
    namespaces,
    sessionProperties
  })
  SettingsStore.setSessions(Object.values(walletkit.getActiveSessions()))
  return session as unknown as SessionTypes.Struct
}

/**
 * Compare two origins. Returns true when they match, OR when Verify could not
 * attest an origin (empty) — in the nested-iframe embedding case Verify may not
 * produce an origin, and the transport-level origin+source check at intake is
 * the primary gate. A present-but-mismatched origin returns false (reject).
 */
export function verifiedOriginMatches(
  verifyContext: SignClientTypes.EventArguments['session_proposal']['verifyContext'] | undefined,
  expectedOrigin: string
): boolean {
  const verified = verifyContext?.verified?.origin
  if (!verified) return true // Verify couldn't attest; rely on transport gate
  try {
    return new URL(verified).origin === new URL(expectedOrigin).origin
  } catch {
    return verified === expectedOrigin
  }
}
