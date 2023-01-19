import PageHeader from '@/components/PageHeader'
import SessionCard from '@/components/SessionCard'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function SessionsPage() {
  const [sessions, setSessions] = useState(Object.values(web3wallet.getActiveSessions()))

  if (!sessions.length) {
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
      {sessions.length
        ? sessions.map(session => {
            const { name, icons, url } = session.peer.metadata

            return (
              <SessionCard
                key={session.topic}
                topic={session.topic}
                name={name}
                logo={icons[0]}
                url={url}
              />
            )
          })
        : null}
    </Fragment>
  )
}
