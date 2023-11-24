import { Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestDataCard from '@/components/RequestDataCard'
import RequestDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import { convertHexToUtf8, styledToast } from '@/utils/HelperUtil'
import { approveKadenaRequest, rejectKadenaRequest } from '@/utils/KadenaRequestHandlerUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'

export default function SessionSignKadenaModal() {
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
  const message = convertHexToUtf8(request.params.message)

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      const response = await approveKadenaRequest(requestEvent)
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
      const response = rejectKadenaRequest(requestEvent)
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
      intention="sign a Kadena message"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
    >
      <RequestDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      {message && (
        <>
          <Row>
            <Col>
              <Text h5>Message</Text>
              <Text color="$gray400">{message}</Text>
            </Col>
          </Row>
          <Divider y={1} />
        </>
      )}
      <RequestDataCard data={params} />
    </RequestModal>
  )
}
