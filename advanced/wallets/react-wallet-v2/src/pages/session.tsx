/* eslint-disable react-hooks/rules-of-hooks */
import PageHeader from '@/components/PageHeader'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import SessionChainCard from '@/components/SessionChainCard'
import { styledToast } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Col, Divider, Loading, Row, Text } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'
import { useRouter } from 'next/router'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Component
 */
export default function SessionPage() {
  const [topic, setTopic] = useState('')
  const [updated, setUpdated] = useState(new Date())
  const { query, replace } = useRouter()
  const [updateLoading, setUpdateLoading] = useState(false)
  const [pingLoading, setPingLoading] = useState(false)
  const [emitLoading, setEmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  const session = useMemo(
    () => web3wallet.engine.signClient.session.values.find(s => s.topic === topic),
    [topic]
  )
  const namespaces = useMemo(() => session?.namespaces, [session])

  // Get necessary data from session
  const expiryDate = useMemo(() => new Date(session?.expiry! * 1000), [session])
  const getPendingRequests = useCallback(() => {
    if (!session) return
    const allPending = web3wallet.getPendingSessionRequests()
    const requestsForSession = allPending?.filter(r => r.topic === session.topic)
    setPendingRequests(requestsForSession)
  }, [session])

  useEffect(() => {
    const interval = setInterval(() => {
      getPendingRequests()
    }, 1000)
    getPendingRequests()
    return () => clearInterval(interval)
  }, [getPendingRequests])

  // Handle deletion of a session
  const onDeleteSession = useCallback(async () => {
    setDeleteLoading(true)
    try {
      await web3wallet.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
      replace('/sessions')
    } catch (e) {
      styledToast((e as Error).message, 'error')
    }
    setDeleteLoading(false)
  }, [topic, replace])

  const onSessionPing = useCallback(async () => {
    setPingLoading(true)
    await web3wallet.engine.signClient.ping({ topic })
    setPingLoading(false)
  }, [topic])

  const onSessionEmit = useCallback(async () => {
    setEmitLoading(true)
    try {
      const namespace = Object.keys(session?.namespaces!)[0]
      const chainId = session?.namespaces[namespace].chains?.[0]
      await web3wallet.emitSessionEvent({
        topic,
        event: { name: 'chainChanged', data: 'Hello World' },
        chainId: chainId! // chainId: 'eip155:1'
      })
    } catch (e) {
      styledToast((e as Error).message, 'error')
    }
    setEmitLoading(false)
  }, [session?.namespaces, topic])

  const onSessionUpdate = useCallback(async () => {
    setUpdateLoading(true)
    try {
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
    } catch (e) {
      styledToast((e as Error).message, 'error')
    }
    setUpdateLoading(false)
  }, [topic])

  return !session ? (
    <></>
  ) : (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      <Divider y={2} />
      {pendingRequests.length > 0 ? (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            Pending Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((request, index) => {
            return (
              <Fragment key={index}>
                <Row>
                  <Col>
                    <Text css={{ color: '$gray400' }}>
                      {request.id} - ⏳{' '}
                      {(
                        (request.params.request?.expiryTimestamp * 1000 - Date.now()) /
                        1000
                      ).toFixed(0)}
                      s
                    </Text>
                  </Col>
                </Row>
              </Fragment>
            )
          })}
          <Divider y={2} />
        </Fragment>
      ) : null}
      {namespaces &&
        Object.keys(namespaces).map(chain => {
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
          {deleteLoading ? <Loading size="sm" color="error" type="points" /> : 'Delete'}
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
          {pingLoading ? <Loading size="sm" color="primary" type="points" /> : 'Ping'}
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
          {emitLoading ? <Loading size="sm" color="secondary" type="points" /> : 'Emit'}
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
          {updateLoading ? <Loading size="sm" color="warning" type="points" /> : 'Update'}
        </Button>
      </Row>
    </Fragment>
  )
}
