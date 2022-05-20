import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import SessionChainCard from '@/components/SessionChainCard'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Loading, Row, Text } from '@nextui-org/react'
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
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    await walletConnectClient.disconnect({ topic, reason: ERROR.DELETED.format() })
    replace('/sessions')
    setLoading(false)
  }

  // function renderAccountSelection(chain: string) {
  //   if (isEIP155Chain(chain)) {
  //     return (
  //       <ProposalSelectSection
  //         addresses={eip155Addresses}
  //         selectedAddresses={selectedAccounts[chain]}
  //         onSelect={onSelectAccount}
  //         chain={chain}
  //       />
  //     )
  //   } else if (isCosmosChain(chain)) {
  //     return (
  //       <ProposalSelectSection
  //         addresses={cosmosAddresses}
  //         selectedAddresses={selectedAccounts[chain]}
  //         onSelect={onSelectAccount}
  //         chain={chain}
  //       />
  //     )
  //   } else if (isSolanaChain(chain)) {
  //     return (
  //       <ProposalSelectSection
  //         addresses={solanaAddresses}
  //         selectedAddresses={selectedAccounts[chain]}
  //         onSelect={onSelectAccount}
  //         chain={chain}
  //       />
  //     )
  //   }
  // }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      <Divider y={2} />

      {Object.keys(namespaces).map(chain => {
        return (
          <Fragment key={chain}>
            <Text h4 css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
            <SessionChainCard namespace={namespaces[chain]} />
            {/* {renderAccountSelection(chain)} */}
            <Divider y={2} />
          </Fragment>
        )
      })}

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>{expiryDate.toDateString()}</Text>
      </Row>

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: '$gray400' }}>{updated.toDateString()}</Text>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="error" onClick={onDeleteSession}>
          {loading ? <Loading size="sm" color="error" /> : 'Delete Session'}
        </Button>
      </Row>
    </Fragment>
  )
}
