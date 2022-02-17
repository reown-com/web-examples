import PageHeader from '@/components/PageHeader'
import SessionCard from '@/components/SessionCard'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { ERROR } from '@walletconnect/utils'
import { Fragment, useState } from 'react'

export default function SessionsPage() {
  const [sessions, setSessions] = useState(walletConnectClient.session.values)

  async function onDelete(topic: string) {
    await walletConnectClient.session.delete({
      topic,
      reason: ERROR.DELETED.format()
    })
    const newSessions = sessions.filter(sessions => sessions.topic !== topic)
    setSessions(newSessions)
  }

  return (
    <Fragment>
      <PageHeader>Sessions</PageHeader>
      {sessions.length ? (
        sessions.map(session => {
          const { name, icons, url } = session.peer.metadata

          return (
            <SessionCard
              key={session.topic}
              name={name}
              logo={icons[0]}
              url={url}
              onDelete={() => onDelete(session.topic)}
            />
          )
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No sessions</Text>
      )}
    </Fragment>
  )
}
