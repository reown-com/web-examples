import ProjectInfoCard from '@/components/ProjectInfoCard'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { Button, Col, Container, Divider, Modal, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SessionUnsuportedMethodModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { chainId } = requestEvent
  const { method } = requestEvent.request

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Unsuported Method</Text>
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
              <Text h5>Method</Text>
              <Text color="$gray400">{method}</Text>
            </Col>
          </Row>
        </Container>
      </Modal.Body>

      <Modal.Footer>
        <Button auto flat color="error" onClick={ModalStore.close}>
          Close
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
