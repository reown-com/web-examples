import { Fragment, useCallback, useEffect, useState } from 'react'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { Button, Col, Modal, Row, Text } from '@nextui-org/react'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { authClient } from '@/utils/WalletConnectUtil'
import { getVerifyStatus } from '@/utils/WalletConnectUtil'

export default function AuthenticationRequestModal() {
  const authenticationRequest = ModalStore.state.data?.authenticationRequest
  const { params, id, verifyContext } = authenticationRequest
  const [message, setMessage] = useState<string>()
  const [iss, setIss] = useState<string>()
  const { eip155Wallets, eip155Addresses } = createOrRestoreEIP155Wallet()

  useEffect(() => {
    if (message) return
    const address = eip155Addresses[0]
    const iss = `did:pkh:${params.cacaoPayload.chainId}:${address}`
    setMessage(authClient.formatMessage(params.cacaoPayload, iss))
    setIss(iss)
  }, [params.cacaoPayload, eip155Addresses, message])

  const onApprove = useCallback(async () => {
    if (authenticationRequest && iss && message) {
      try {
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
      } catch (onApproveError) {
        console.log({ onApproveError })
      } finally {
        ModalStore.close()
      }
    }
  }, [authenticationRequest, eip155Addresses, eip155Wallets, id, iss, message])

  if (!authenticationRequest) {
    return <Text>Missing authentication request</Text>
  }

  // Handle reject action
  async function onReject() {
    if (id && iss) {
      try {
        await authClient.respond(
          {
            id,
            error: {
              code: 4001,
              message: 'Auth request has been rejected'
            }
          },
          iss
        )
      } catch (onRejectError) {
        console.log({ onRejectError })
      }
    }
    ModalStore.close()
  }

  return (
    <Fragment>
      <RequestModalContainer title="Authentication Request">
        <Row>
          <Col>
            <Text h5>Message {getVerifyStatus(verifyContext)}</Text>            
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
