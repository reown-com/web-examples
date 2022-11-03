import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isEIP155Chain } from '@/utils/HelperUtil'
import { legacySignClient } from '@/utils/LegacyWalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'
import { Fragment, useState } from 'react'

export default function LegacySessionProposalModal() {
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string[]>>({})
  const hasSelected = Object.keys(selectedAccounts).length

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.legacyProposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { id, params } = proposal
  const [{ chainId, peerMeta }] = params

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
      legacySignClient.approveSession({
        accounts: selectedAccounts['eip155'],
        chainId: chainId ?? 1
      })
    }
    ModalStore.close()
  }

  // Handle reject action
  function onReject() {
    if (proposal) {
      legacySignClient.rejectSession(getSdkError('USER_REJECTED_METHODS'))
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
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={peerMeta} />
        <Divider y={2} />
        {renderAccountSelection('eip155')}
        <Divider y={2} />
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
