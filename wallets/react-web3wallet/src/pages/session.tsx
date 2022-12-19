import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import SessionChainCard from '@/components/SessionChainCard'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Divider, Loading, Row, Text } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'
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

  const session = web3wallet.getActiveSessions()[topic]

  if (!session) {
    return null
  }

  // Get necessary data from session
  const expiryDate = new Date(session.expiry * 1000)
  const { namespaces } = session

  // Handle deletion of a session
  async function onDeleteSession() {
    setLoading(true)
    await web3wallet.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
    replace('/sessions')
    setLoading(false)
  }

  async function onSessionPing() {
    setLoading(true)
    await web3wallet.engine.signClient.ping({ topic })
    setLoading(false)
  }

  async function onSessionEmit() {
    setLoading(true)
    console.log('baleg')
    await web3wallet.emitSessionEvent({
      topic,
      event: { name: 'chainChanged', data: 'Hello World' },
      chainId: 'eip155:1'
    })
    setLoading(false)
  }

  const newNs = {
    eip155: {
      accounts: [
        'eip155:1:0x70012948c348CBF00806A3C79E3c5DAdFaAa347B',
        'eip155:137:0x70012948c348CBF00806A3C79E3c5DAdFaAa347B'
      ],
      methods: ['personal_sign', 'eth_signTypedData', 'eth_sendTransaction'],
      events: []
    }
  }

  async function onSessionUpdate() {
    setLoading(true)
    await web3wallet.updateSession({ topic, namespaces: newNs })
    setUpdated(new Date())
    setLoading(false)
  }

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
          {loading ? <Loading size="sm" color="error" /> : 'Delete'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="primary" onClick={onSessionPing}>
          {loading ? <Loading size="sm" color="primary" /> : 'Ping'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="secondary" onClick={onSessionEmit}>
          {loading ? <Loading size="sm" color="secondary" /> : 'Emit'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="warning" onClick={onSessionUpdate}>
          {loading ? <Loading size="sm" color="warning" /> : 'Update'}
        </Button>
      </Row>
    </Fragment>
  )
}
