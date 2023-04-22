import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequestModalContainer from '@/components/RequestModalContainer'
import SessionProposalChainCard from '@/components/SessionProposalChainCard'
import ModalStore from '@/store/ModalStore'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { polkadotAddresses } from '@/utils/PolkadotWalletUtil'
import { elrondAddresses } from '@/utils/ElrondWalletUtil'
import { tronAddresses } from '@/utils/TronWalletUtil'
import { tezosAddresses } from '@/utils/TezosWalletUtil'
import {
  isCosmosChain,
  isEIP155Chain,
  isSolanaChain,
  isPolkadotChain,
  isNearChain,
  isElrondChain,
  isTronChain,
  isTezosChain
} from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { signClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { ProposalTypes } from '@walletconnect/types'
import {
  BuildApprovedNamespacesParams,
  buildApprovedNamespaces,
  getSdkError
} from '@walletconnect/utils'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { nearAddresses } from '@/utils/NearWalletUtil'
import { getSupportedNamespaces } from '@/data/shared'

export default function SessionProposalModal() {
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string[]>>({})
  const [proposal, setProposal] = useState<ProposalTypes.Struct>()
  const [supportedNamespaces, setSupportedNamespaces] = useState<
    BuildApprovedNamespacesParams['supportedNamespaces']
  >({})
  const hasSelected = Object.keys(selectedAccounts).length

  // Get proposal data and wallet address from store
  const event = ModalStore.state.data?.proposal
  // // Ensure proposal is defined

  useEffect(() => {
    if (event) {
      setProposal(event.params)
    }
  }, [event])

  useMemo(async () => {
    const supportedNamespaces = await getSupportedNamespaces(selectedAccounts)
    setSupportedNamespaces(supportedNamespaces)
    console.log('supportedNamespaces', JSON.parse(JSON.stringify(supportedNamespaces)))
  }, [selectedAccounts])

  // Add / remove address from EIP155 selection
  const onSelectAccount = useCallback(
    (chain: string, account: string) => {
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
    },
    [selectedAccounts]
  )

  // Hanlde approve action, construct session namespace
  const onApprove = useCallback(async () => {
    console.log(
      'onApprove',
      selectedAccounts,
      supportedNamespaces,
      console.log('proposal', JSON.parse(JSON.stringify(proposal)), supportedNamespaces),
      buildApprovedNamespaces({
        proposal,
        supportedNamespaces
      })
    )

    if (proposal) {
      const namespaces = buildApprovedNamespaces({
        proposal,
        supportedNamespaces
      })
      const { acknowledged } = await signClient.approve({
        id: proposal.id,
        relayProtocol: proposal.relays[0].protocol,
        namespaces
      })
      await acknowledged()
    }
    ModalStore.close()
  }, [proposal, supportedNamespaces, selectedAccounts])

  // Hanlde reject action
  const onReject = useCallback(async () => {
    if (proposal) {
      await signClient.reject({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS')
      })
    }
    ModalStore.close()
  }, [proposal])

  // Render account selection checkboxes based on chain
  const renderAccountSelection = useCallback(
    (chain: string) => {
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
    },
    [onSelectAccount, selectedAccounts]
  )
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  return (
    <Fragment>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposal.proposer.metadata} />

        {/* TODO(ilja) Relays selection */}

        <Divider y={2} />

        {Object.keys(proposal.requiredNamespaces).map(chain => {
          return (
            <Fragment key={chain}>
              <Text h4 css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={proposal.requiredNamespaces[chain]} />
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
