import { Fragment, useCallback, useEffect, useState } from 'react'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { Button, Col, Link, Modal, Row, Text } from '@nextui-org/react'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { pushClient } from '@/utils/WalletConnectUtil'

export default function PushRequestModal() {
  const pushRequest = ModalStore.state.data?.pushRequest
  const { params, id } = pushRequest
  const [iss, setIss] = useState<string>()
  const { eip155Wallets, eip155Addresses } = createOrRestoreEIP155Wallet()
  useEffect(() => {
    const iss = `did:pkh:${pushRequest.params.account}`
    setIss(iss)
  }, [pushRequest.params.account, eip155Addresses])

  const onApprove = useCallback(async () => {
    if (pushRequest && iss) {
      console.log({ eip155Wallets })

      await pushClient.approve({ id })
      ModalStore.close()
    }
  }, [pushRequest, eip155Wallets, id, iss])

  if (!pushRequest) {
    return <Text>Missing push request</Text>
  }

  // Handle reject action
  async function onReject() {
    await pushClient.reject({ id, reason: 'User rejected push subscription request' })

    ModalStore.close()
  }

  return (
    <Fragment>
      <RequestModalContainer title="Push Request">
        <Row>
          <Col>
            <Text h5>Message</Text>
            <Text style={{ whiteSpace: 'pre-wrap' }} color="$gray400">
              Subscribe to{' '}
              <Link href={params.metadata.url} target="_blank" rel="noopener noreferrer">
                {params.metadata.url}
              </Link>
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
