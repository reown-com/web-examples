import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import RequestModalContainer from '@/components/RequestModalContainer'
import SessionProposalChainCard from '@/components/SessionProposalChainCard'
import ModalStore from '@/store/ModalStore'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isEIP155Chain } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { Fragment, useEffect, useState } from 'react'

export default function SessionProposalModal() {
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string[]>>({})
  const hasSelected = Object.keys(selectedAccounts).length

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal
  useEffect(() => {
    console.log('selectedAccounts', selectedAccounts)
  }, [selectedAccounts])

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { id, params } = proposal

  const { proposer, requiredNamespaces, optionalNamespaces, sessionProperties, relays } = params
  console.log('proposal', params, requiredNamespaces, optionalNamespaces, sessionProperties)
  const requiredNamespaceKeys = requiredNamespaces ? Object.keys(requiredNamespaces) : []
  const optionalNamespaceKeys = optionalNamespaces ? Object.keys(optionalNamespaces) : []

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

      console.log('selectedOptionalNamespaces', selectedOptionalNamespaces)

      requiredNamespaceKeys.concat(selectedOptionalNamespaces).forEach(key => {
        const accounts: string[] = []
        if (requiredNamespaces[key].chains) {
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
            chains: namespaces[key].chains?.concat(optionalNamespaces[key].chains || [])
          }
        }
      })

      console.log('namespaces', namespaces)

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
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />

        <Divider y={2} />

        {requiredNamespaceKeys.length ? <Text h4>Required Namespaces</Text> : null}
        {requiredNamespaceKeys.map(chain => {
          return (
            <Fragment key={chain}>
              <Text css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
              <SessionProposalChainCard requiredNamespace={requiredNamespaces[chain]} />
              {renderAccountSelection(`required:${chain}`)}
              <Divider y={2} />
            </Fragment>
          )
        })}
        {optionalNamespaceKeys ? <Text h4>Optional Namespaces</Text> : null}
        {optionalNamespaceKeys.length &&
          optionalNamespaceKeys.map(chain => {
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
