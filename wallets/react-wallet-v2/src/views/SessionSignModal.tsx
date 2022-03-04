import ProjectInfoCard from '@/components/ProjectInfoCard'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { getSignParamsMessage } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Col, Container, Divider, Modal, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SessionSignModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { chainId } = requestEvent
  const { method, params } = requestEvent.request
  const { protocol } = requestSession.relay

  // Get message, convert it to UTF8 string if it is valid hex
  const message = getSignParamsMessage(params)

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
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
        <Text h3>Sign Message</Text>
      </Modal.Header>

      <Modal.Body>
        <Container css={{ padding: 0 }}>
          <ProjectInfoCard metadata={requestSession.peer.metadata} />

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
              <Text h5>Message</Text>
              <Text color="$gray400">{message}</Text>
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
        <Button auto flat color="error" onClick={onReject}>
          Reject
        </Button>
        <Button auto flat color="success" onClick={onApprove}>
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
