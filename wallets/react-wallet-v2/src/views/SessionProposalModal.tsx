import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequestModalContainer from '@/components/RequestModalContainer'
import SessionProposalChainCard from '@/components/SessionProposalChainCard'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { polkadotAddresses } from '@/utils/PolkadotWalletUtil'
import { multiversxAddresses } from '@/utils/MultiversxWalletUtil'
import { tronAddresses } from '@/utils/TronWalletUtil'
import { tezosAddresses } from '@/utils/TezosWalletUtil'
import {
  isCosmosChain,
  isEIP155Chain,
  isSolanaChain,
  isPolkadotChain,
  isNearChain,
  isMultiversxChain,
  isTronChain,
  isTezosChain
} from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { signClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { Fragment, useEffect, useState } from 'react'
import { nearAddresses } from '@/utils/NearWalletUtil'

export default function SessionProposalModal() {
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string[]>>({})
  const hasSelected = Object.keys(selectedAccounts).length

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { id, params } = proposal

  const { proposer, requiredNamespaces, optionalNamespaces, sessionProperties, relays } = params

  // Add / remove address from EIP155 selection
  function onSelectAccount(chain: string, account: string) {
    if (selectedAccounts[chain]?.includes(account)) {
      const newSelectedAccounts = selectedAccounts[chain]?.filter(a => a !== account)
      setSelectedAccounts(prev => ({
        ...prev,
        [chain]: newSelectedAccounts
      }))
    } else {
      const prevChainAddresses = selectedAccounts[chain] ?? []
      setSelectedAccounts(prev => ({
        ...prev,
        [chain]: [...prevChainAddresses, account]
      }))
    }
  }

  // Hanlde approve action, construct session namespace
  async function onApprove() {
    if (proposal) {
      let namespaces: SessionTypes.Namespaces = {}
      const selectedOptionalNamespaces = []
      for (const [chain, account] of Object.entries(selectedAccounts)) {
        if (chain.includes('optional')) {
          selectedOptionalNamespaces.push(chain.split(':')[1])
        }
      }

      Object.keys(requiredNamespaces)
        .concat(selectedOptionalNamespaces)
        .forEach(key => {
          const accounts: string[] = []
          if (requiredNamespaces[key] && requiredNamespaces[key]?.chains) {
            requiredNamespaces[key].chains?.map(chain => {
              selectedAccounts[`required:${key}`].map(acc => accounts.push(`${chain}:${acc}`))
            })
            namespaces[key] = {
              accounts,
              methods: requiredNamespaces[key].methods,
              events: requiredNamespaces[key].events,
              chains: requiredNamespaces[key].chains
            }
          }
          if (optionalNamespaces[key] && selectedAccounts[`optional:${key}`]) {
            optionalNamespaces[key].chains?.map(chain => {
              selectedAccounts[`optional:${key}`].map(acc => accounts.push(`${chain}:${acc}`))
            })
            namespaces[key] = {
              ...namespaces[key],
              accounts,
              methods: optionalNamespaces[key].methods,
              events: optionalNamespaces[key].events,
              chains: namespaces[key]?.chains?.concat(optionalNamespaces[key].chains || [])
            }
          }
        })

      await signClient.approve({
        id,
        relayProtocol: relays[0].protocol,
        namespaces
      })
    }
    ModalStore.close()
  }

  // Hanlde reject action
  async function onReject() {
    if (proposal) {
      await signClient.reject({
        id,
        reason: getSdkError('USER_REJECTED_METHODS')
      })
    }
    ModalStore.close()
  }

  // Render account selection checkboxes based on chain
  function renderAccountSelection(chain: string) {
    if (isEIP155Chain(chain)) {
      return (
        <ProposalSelectSection
          addresses={eip155Addresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isCosmosChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={cosmosAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isSolanaChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={solanaAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isPolkadotChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={polkadotAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isNearChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={nearAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isMultiversxChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={multiversxAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isTronChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={tronAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    } else if (isTezosChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={tezosAddresses}
          selectedAddresses={selectedAccounts[chain]}
          onSelect={onSelectAccount}
          chain={chain}
        />
      )
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />

        <Divider y={2} />
        {Object.keys(requiredNamespaces).length != 0 ? <Text h4>Required Namespaces</Text> : null}
        {Object.keys(requiredNamespaces).map(chain => {
          return (
            <Fragment key={chain}>
              <Text css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={requiredNamespaces[chain]} />
              {renderAccountSelection(`required:${chain}`)}
              <Divider y={2} />
            </Fragment>
          )
        })}
        {optionalNamespaces && Object.keys(optionalNamespaces).length != 0 ? (
          <Text h4>Optional Namespaces</Text>
        ) : null}
        {optionalNamespaces &&
          Object.keys(optionalNamespaces).length != 0 &&
          Object.keys(optionalNamespaces).map(chain => {
            return (
              <Fragment key={chain}>
                <Text css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
                <SessionProposalChainCard requiredNamespace={optionalNamespaces[chain]} />
                {renderAccountSelection(`optional:${chain}`)}
                <Divider y={2} />
              </Fragment>
            )
          })}
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onPress={onReject}>
          Reject
        </Button>

        <Button
          auto
          flat
          color="success"
          onPress={onApprove}
          disabled={!hasSelected}
          css={{ opacity: hasSelected ? 1 : 0.4 }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
