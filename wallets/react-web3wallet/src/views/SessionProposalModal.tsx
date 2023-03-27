import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequestModalContainer from '@/components/RequestModalContainer'
import SessionProposalChainCard from '@/components/SessionProposalChainCard'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { polkadotAddresses } from '@/utils/PolkadotWalletUtil'
import { elrondAddresses } from '@/utils/ElrondWalletUtil'
import {
  isCosmosChain,
  isEIP155Chain,
  isSolanaChain,
  isPolkadotChain,
  isNearChain,
  isElrondChain
} from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { Fragment, useState } from 'react'
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
  const { proposer, requiredNamespaces, relays } = params

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
      const namespaces: SessionTypes.Namespaces = {}
      Object.keys(requiredNamespaces).forEach(key => {
        const accounts: string[] = []
        requiredNamespaces[key].chains.map(chain => {
          selectedAccounts[key].map(acc => accounts.push(`${chain}:${acc}`))
        })
        namespaces[key] = {
          accounts,
          methods: requiredNamespaces[key].methods,
          events: requiredNamespaces[key].events
        }
      })

      await web3wallet.approveSession({
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
      await web3wallet.rejectSession({
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
    } else if (isElrondChain(chain)) {
      return (
        <ProposalSelectSection
          addresses={elrondAddresses}
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

        {/* TODO(ilja) Relays selection */}

        <Divider y={2} />

        {Object.keys(requiredNamespaces).map(chain => {
          return (
            <Fragment key={chain}>
              <Text h4 css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={requiredNamespaces[chain]} />
              {renderAccountSelection(chain)}
              <Divider y={2} />
            </Fragment>
          )
        })}
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          Reject
        </Button>

        <Button
          auto
          flat
          color="success"
          onClick={onApprove}
          disabled={!hasSelected}
          css={{ opacity: hasSelected ? 1 : 0.4 }}
        >
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
