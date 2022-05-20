import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import ProposalSelectSection from '@/components/ProposalSelectSection'
import SessionChainCard from '@/components/SessionChainCard'
import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { isCosmosChain, isEIP155Chain, isSolanaChain } from '@/utils/HelperUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Row, Text } from '@nextui-org/react'
import { ERROR } from '@walletconnect/utils'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState('')
  const [updated, setUpdated] = useState(new Date())
  const { query, replace } = useRouter()

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  const session = walletConnectClient.session.values.find(s => s.topic === topic)

  if (!session) {
    return null
  }

  // Get necessary data from session
  const expiryDate = new Date(session.expiry * 1000)
  const { namespaces } = session

  // Handle deletion of a session
  async function onDeleteSession() {
    await walletConnectClient.disconnect({ topic, reason: ERROR.DELETED.format() })
    replace('/sessions')
  }

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
    }
  }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      {Object.keys(namespaces).map(chain => {
        return (
          <Fragment key={chain}>
            <Text h4 css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
            <SessionChainCard namespace={namespaces[chain]} />
            {renderAccountSelection(chain)}
            <Divider y={2} />
          </Fragment>
        )
      })}

      <Divider y={1} />

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>{expiryDate.toDateString()}</Text>
      </Row>

      <Divider y={1} />

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: '$gray400' }}>{updated.toDateString()}</Text>
      </Row>

      <Divider y={1} />

      <Row>
        <Button flat css={{ width: '100%' }} color="error" onClick={onDeleteSession}>
          Delete Session
        </Button>
      </Row>
    </Fragment>
  )
}
