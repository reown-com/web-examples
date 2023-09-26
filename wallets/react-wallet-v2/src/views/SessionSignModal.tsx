import { Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { getSignParamsMessage, styledToast } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'
export default function SessionSignModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params

  // Get message, convert it to UTF8 string if it is valid hex
  const message = getSignParamsMessage(request.params)

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      const response = await approveEIP155Request(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        styledToast((e as Error).message, 'error')
        return
      }
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      const response = rejectEIP155Request(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        styledToast((e as Error).message, 'error')
        return
      }
      ModalStore.close()
    }
  }

  return (
    <RequestModal
      intention="request a signature"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
    >
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Message</Text>
          <Text color="$gray400" data-testid="request-message-text">
            {message}
          </Text>
        </Col>
      </Row>
    </RequestModal>
  )
}
