import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestDataCard from '@/components/RequestDataCard'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Col, Container, Divider, Loading, Modal, Row, Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function SessionSendTransactionModal() {
  const [loading, setLoading] = useState(false)

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required proposal data
  const { chainId } = requestEvent
  const { method, params } = requestEvent.request
  const { protocol } = requestSession.relay
  const transaction = params[0]

  // Handle approve action
  async function onApprove() {
    if (requestEvent) {
      setLoading(true)
      const response = await approveEIP155Request(requestEvent)
      await walletConnectClient.respond({
        topic: requestEvent.topic,
        response
      })
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      const response = rejectEIP155Request(requestEvent.request)
      await walletConnectClient.respond({
        topic: requestEvent.topic,
        response
      })
      ModalStore.close()
    }
  }

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Send / Sign Transaction</Text>
      </Modal.Header>

      <Modal.Body>
        <Container css={{ padding: 0 }}>
          <ProjectInfoCard metadata={requestSession.peer.metadata} />

          <Divider y={2} />

          <RequestDataCard data={transaction} />

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Blockchain</Text>
              <Text color="$gray400">
                {EIP155_CHAINS[chainId as TEIP155Chain]?.name ?? chainId}
              </Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Method</Text>
              <Text color="$gray400">{method}</Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Relay Protocol</Text>
              <Text color="$gray400">{protocol}</Text>
            </Col>
          </Row>
        </Container>
      </Modal.Body>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject} disabled={loading}>
          Reject
        </Button>
        <Button auto flat color="success" onClick={onApprove} disabled={loading}>
          {loading ? <Loading size="sm" color="success" /> : 'Approve'}
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
