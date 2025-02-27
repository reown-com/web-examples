import PageHeader from '@/components/PageHeader'
import SessionCard from '@/components/SessionCard'
import SettingsStore from '@/store/SettingsStore'
import { Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'

export default function SessionsPage() {
  const { sessions } = useSnapshot(SettingsStore.state)

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
