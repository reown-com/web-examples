import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import SessionChainCard from '@/components/SessionChainCard'
import SettingsStore from '@/store/SettingsStore'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Divider, Loading, Row, Text } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState('')
  const [updated, setUpdated] = useState(new Date())
  const { query, replace } = useRouter()
  const [loading, setLoading] = useState(false)

  const { activeChainId } = useSnapshot(SettingsStore.state)

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  const session = web3wallet.engine.signClient.session.values.find(s => s.topic === topic)

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
    await web3wallet.emitSessionEvent({
      topic,
      event: { name: 'chainChanged', data: 'Hello World' },
      chainId: activeChainId.toString() // chainId: 'eip155:1'
    })
    setLoading(false)
  }

  async function onSessionUpdate() {
    setLoading(true)
    const session = web3wallet.engine.signClient.session.get(topic)
    const baseAddress = '0x70012948c348CBF00806A3C79E3c5DAdFaAa347'
    const namespaceKeyToUpdate = Object.keys(session?.namespaces)[0]
    const namespaceToUpdate = session?.namespaces[namespaceKeyToUpdate]
    await web3wallet.updateSession({
      topic,
      namespaces: {
        ...session?.namespaces,
        [namespaceKeyToUpdate]: {
          ...session?.namespaces[namespaceKeyToUpdate],
          accounts: namespaceToUpdate.accounts.concat(
            `${namespaceToUpdate.chains?.[0]}:${baseAddress}${Math.floor(
              Math.random() * (9 - 1 + 1) + 0
            )}`
          ) // generates random number between 0 and 9
        }
      }
    })
    setUpdated(new Date())
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
            <SessionChainCard
              namespace={namespaces[chain]}
              data-testid={'session-card' + namespaces[chain]}
            />
            <Divider y={2} />
          </Fragment>
        )
      })}

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>
          {expiryDate.toDateString()} - {expiryDate.toLocaleTimeString()}
        </Text>
      </Row>

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: '$gray400' }}>
          {updated.toDateString()} - {updated.toLocaleTimeString()}
        </Text>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button
          flat
          css={{ width: '100%' }}
          color="error"
          onClick={onDeleteSession}
          data-testid="session-delete-button"
        >
          {loading ? <Loading size="sm" color="error" /> : 'Delete'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button
          flat
          css={{ width: '100%' }}
          color="primary"
          onClick={onSessionPing}
          data-testid="session-ping-button"
        >
          {loading ? <Loading size="sm" color="primary" /> : 'Ping'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button
          flat
          css={{ width: '100%' }}
          color="secondary"
          onClick={onSessionEmit}
          data-testid="session-emit-button"
        >
          {loading ? <Loading size="sm" color="secondary" /> : 'Emit'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button
          flat
          css={{ width: '100%' }}
          color="warning"
          onClick={onSessionUpdate}
          data-testid="session-update-button"
        >
          {loading ? <Loading size="sm" color="warning" /> : 'Update'}
        </Button>
      </Row>
    </Fragment>
  )
}
