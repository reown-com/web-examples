import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { getWalletAddressFromParams, truncate } from '@/utils/HelperUtil'
import { pushClient } from '@/utils/WalletConnectUtil'

import { Avatar, Button, Col, Divider, Modal, Row, Text, Link } from '@nextui-org/react'
import { Fragment } from 'react'

export default function PushSubscriptionRequestModal() {
  // Get subscription request data and wallet address from store
  const pushRequestEvent = ModalStore.state.data?.pushRequestEvent

  // Ensure proposal is defined
  if (!pushRequestEvent?.params.metadata) {
    return <Text>Missing metadata in push subscription request</Text>
  }

  // Get required proposal data
  const { id, topic, params } = pushRequestEvent
  const { metadata, account } = params

  async function onApprove() {
    await pushClient.approve({ id, onSign: onPushSign })
    ModalStore.close()
  }

  async function onReject() {
    await pushClient.reject({ id, reason: 'User rejected push subscription request' })
    ModalStore.close()
  }

  async function onPushSign(message: string) {
    console.log('onPushSign > params.account:', account)

    const wallet = eip155Wallets[getWalletAddressFromParams(eip155Addresses, account)]
    console.log('onPushSign wallet found: ', wallet)
    const signedMessage = await wallet.signMessage(message)
    console.log('onPushSign signedMessage: ', signedMessage)

    return signedMessage
  }

  return (
    <Fragment>
      <RequestModalContainer title="Push Subscription Request">
        <Row align="center">
          <Col span={3}>
            <Avatar src={metadata.icons[0]} />
          </Col>
          <Col span={14}>
            <Text h5>{metadata.name}</Text>
            <Link href={metadata.url}>{metadata.url}</Link>
          </Col>
        </Row>

        <Divider y={2} />

        <Row align="center">
          {metadata.name} ({metadata.url}) is requesting to establish a Push subscription with your
          wallet.
        </Row>
        <Divider y={2} />
        <Row align="center">
          <Text h5>Account: {truncate(account, 28)}</Text>
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
