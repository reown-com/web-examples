/* eslint-disable react-hooks/rules-of-hooks */
import { Col, Divider, Row, Text } from '@nextui-org/react'
import { useCallback, useState } from 'react'

import RequesDetailsCard from '@/components/RequestDetalilsCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { tonAddresses } from '@/utils/TonWalletUtil'
import { approveTonRequest, rejectTonRequest } from '@/utils/TonRequestHandlerUtil'

export default function SessionTonSendMessageModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params

  // Extract message details for display (SendMessage spec)
  const tx = Array.isArray(request.params) ? request.params[0] : request.params || {}
  const messages = Array.isArray(tx.messages) ? tx.messages : []

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent) {
        setIsLoadingApprove(true)
        const response = await approveTonRequest(requestEvent)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      }
    } catch (e) {
      styledToast((e as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectTonRequest(requestEvent)
      try {
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingReject(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  return (
    <RequestModal
      intention="sign a transaction"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <Row>
        <Col>
          <Text h5>Sign with Address</Text>
          <Text color="$gray400" data-testid="request-detauls-realy-protocol">
            {tonAddresses[0]}
          </Text>
        </Col>
      </Row>
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Method</Text>
          <Text color="$gray400" data-testid="request-detauls-realy-protocol">
            {request.method}
          </Text>
        </Col>
      </Row>
      <Divider y={1} />
      <RequesDetailsCard chains={[chainId ?? '']} />
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Transaction details</Text>
          {messages.length === 0 ? (
            <Text color="$gray400">No messages</Text>
          ) : (
            messages.map((m: any, idx: number) => (
              <Text key={idx} color="$gray400" data-testid="request-message-text">
                <code>
                  To: {m.address}
                  <br />
                  Amount: {m.amount} nanotons
                  <br />
                  {m.payload && `Payload: ${m.payload}`}
                  {m.stateInit && (
                    <>
                      <br />
                      StateInit: {m.stateInit}
                    </>
                  )}
                </code>
              </Text>
            ))
          )}
        </Col>
      </Row>
    </RequestModal>
  )
}
