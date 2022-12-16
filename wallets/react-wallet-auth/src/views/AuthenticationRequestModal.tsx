import { Fragment, useCallback, useEffect, useState } from 'react'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { Button, Col, Divider, Modal, Row, Text } from '@nextui-org/react'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { authClient } from '@/utils/WalletConnectUtil'

export default function AuthenticationRequestModal() {
  const authenticationRequest = ModalStore.state.data?.authenticationRequest
  const { params, id } = authenticationRequest
  const [message, setMessage] = useState<string>()
  const [iss, setIss] = useState<string>()
  const { eip155Wallets, eip155Addresses } = createOrRestoreEIP155Wallet()

  useEffect(() => {
    if (message) return
    const address = eip155Addresses[0]
    const iss = `did:pkh:eip155:1:${address}`
    setMessage(authClient.formatMessage(authenticationRequest.params.cacaoPayload, iss))
    setIss(iss)
  }, [authenticationRequest.params.cacaoPayload, eip155Addresses, message])

  const onApprove = useCallback(async () => {
    if (authenticationRequest && iss && message) {
      console.log({ eip155Wallets })

      const signature = await eip155Wallets[eip155Addresses[0]].signMessage(message)
      await authClient.respond(
        {
          id,
          signature: {
            s: signature,
            t: 'eip191'
          }
        },
        iss
      )
      ModalStore.close()
    }
  }, [authenticationRequest, eip155Addresses, eip155Wallets, id, iss, message])

  if (!authenticationRequest) {
    return <Text>Missing authentication request</Text>
  }

  // Handle reject action
  async function onReject() {
    ModalStore.close()
  }

  return (
    <Fragment>
      <RequestModalContainer title="Authentication Request">
        <Row>
          <Col>
            <Text h5>Message</Text>
            <Text style={{ whiteSpace: 'pre-wrap' }} color="$gray400">
              {message}
            </Text>
          </Col>
        </Row>
      </RequestModalContainer>
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
