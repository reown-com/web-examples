import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { getSignTypedDataParamsData } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Avatar, Button, Col, Container, Divider, Link, Modal, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { CodeBlock, codepen } from 'react-code-blocks'

export default function SessionSignTypedDataModal() {
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
  const { name, icons, url } = requestSession.peer.metadata

  // Get data
  const data = getSignTypedDataParamsData(params)

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
        <Text h3>Sign Typed Data</Text>
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
              <Text color="$gray400">
                {EIP155_CHAINS[chainId as TEIP155Chain]?.name ?? chainId}
              </Text>
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col className="codeBlock">
              <Text h5>Domain</Text>
              <CodeBlock
                showLineNumbers={false}
                text={JSON.stringify(data.domain, null, 2)}
                theme={codepen}
                language="json"
              />
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col className="codeBlock">
              <Text h5>Types</Text>
              <CodeBlock
                showLineNumbers={false}
                text={JSON.stringify(data.types, null, 2)}
                theme={codepen}
                language="json"
              />
            </Col>
          </Row>

          <Divider y={2} />

          <Row>
            <Col className="codeBlock">
              <Text h5>Message</Text>
              <CodeBlock
                showLineNumbers={false}
                text={JSON.stringify(data.message, null, 2)}
                theme={codepen}
                language="json"
              />
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
