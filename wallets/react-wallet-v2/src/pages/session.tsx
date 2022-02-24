import PageHeader from '@/components/PageHeader'
import { truncate } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Avatar, Col, Link, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState('')
  const { query } = useRouter()

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  // async function onDelete(topic: string) {
  //   await walletConnectClient.session.delete({
  //     topic,
  //     reason: ERROR.DELETED.format()
  //   })
  //   const newSessions = sessions.filter(sessions => sessions.topic !== topic)
  //   setSessions(newSessions)
  // }

  const session = walletConnectClient.session.values.find(s => s.topic === topic)

  console.log(session)

  if (!session) {
    return null
  }

  const { name, url, icons } = session.peer.metadata

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <Row align="center">
        <Col css={{ flex: 1 }}>
          <Avatar size="xl" src={icons[0]} />
        </Col>
        <Col css={{ marginLeft: '$5' }}>
          <Text h5>{name}</Text>
          <Link css={{ marginLeft: '$5' }} href={url}>
            {truncate(url?.split('https://')[1] ?? 'Unknown', 23)}
          </Link>
        </Col>
      </Row>
    </Fragment>
  )
}
