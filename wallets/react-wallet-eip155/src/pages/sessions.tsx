import PageHeader from '@/components/PageHeader'
import SessionCard from '@/components/SessionCard'
import { legacySignClient } from '@/utils/LegacyWalletConnectUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SessionsPage() {
  const sessions = web3wallet.getActiveSessions()
  const sessionTopics = Object.keys(sessions)
  const legacySession = legacySignClient?.session

  if (!legacySession && !sessionTopics.length) {
    return (
      <Fragment>
        <PageHeader title="Sessions" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No sessions</Text>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <PageHeader title="Sessions" />
      {legacySession ? (
        <SessionCard
          name={legacySession.peerMeta?.name + ' (v1/legacy)'}
          url={legacySession.peerMeta?.url}
          logo={legacySession.peerMeta?.icons[0]}
        />
      ) : null}
      {sessionTopics.length
        ? sessionTopics.map(topic => {
            const { name, icons, url } = sessions[topic].peer.metadata

            return <SessionCard key={topic} topic={topic} name={name} logo={icons[0]} url={url} />
          })
        : null}
    </Fragment>
  )
}
