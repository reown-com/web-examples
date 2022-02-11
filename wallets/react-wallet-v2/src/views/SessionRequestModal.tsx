import ModalStore from '@/store/ModalStore'
import { CHAIN, MAINNET_CHAINS } from '@/utils/EIP155ChainsUtil'
import { Avatar, Button, Col, Container, Divider, Link, Modal, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SessionRequestModal() {
  const request = ModalStore.state.data?.request
  const requestSession = ModalStore.state.data?.requestSession

  if (!request || !requestSession) {
    return <Text>Missing request data</Text>
  }

  const {
    chainId,
    request: { method }
  } = request
  const { protocol } = requestSession.relay
  const { name, icons, url } = requestSession.peer.metadata

  async function onApprove() {}

  async function onReject() {}

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Request</Text>
      </Modal.Header>

      <Modal.Body>
        <Container css={{ padding: 0 }}>
          <Row align="center">
            <Col span={3}>
              <Avatar src={icons[0]} />
            </Col>
            <Col span={14}>
              <Text h5>{name}</Text>
              <Link href={url}>{url}</Link>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col>
              <Text h5>Blockchain</Text>
              <Text color="$gray400">{MAINNET_CHAINS[chainId as CHAIN]?.name ?? chainId}</Text>
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
