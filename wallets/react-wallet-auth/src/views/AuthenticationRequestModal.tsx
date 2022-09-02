import { Fragment } from 'react'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { Button, Col, Divider, Modal, Row, Text } from '@nextui-org/react'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { authClient } from '@/utils/WalletConnectUtil'

export default function AuthenticationRequestModal() {
  const authenticationRequest = ModalStore.state.data?.authenticationRequest

  if (!authenticationRequest) {
    return <Text>Missing authentication request</Text>
  }

  const { params, id } = authenticationRequest

  async function onApprove() {
    if (authenticationRequest) {
      const { eip155Wallets, eip155Addresses } = createOrRestoreEIP155Wallet()
      console.log({ eip155Wallets })
      const signature = await eip155Wallets[eip155Addresses[0]].signMessage(params.message)
      await authClient.respond({
        id,
        signature: {
          s: signature,
          t: 'eip191'
        }
      })
      ModalStore.close()
    }
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
              {params.message}
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
