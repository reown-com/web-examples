import { useCallback, useState } from 'react'
import { Col, Divider, Row, Text } from '@nextui-org/react'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { approveEIP5792Request, rejectEIP5792Request } from '@/utils/EIP5792RequestHandlerUtils'
import { approveStacksRequest, rejectStacksRequest } from '@/utils/StacksRequestHandlerUtil'
import { formatJsonRpcError } from '@json-rpc-tools/utils'

export default function SessionSendStacksTransferModal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params
  const chainId = params?.chainId
  const request = params?.request

  // Handle approve action
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent && topic) {
        setIsLoadingApprove(true)
        console.log('Calls approved.')
        const response = await approveStacksRequest(requestEvent)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      }
    } catch (e) {
      console.log('error', e)
      await walletkit.respondSessionRequest({
        topic: topic!,
        response: formatJsonRpcError(requestEvent?.id!, (e as Error).message)
      })
      styledToast((e as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingReject(true)
      const response = rejectStacksRequest(requestEvent)
      try {
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingReject(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  return request && requestSession ? (
    <RequestModal
      intention="send a stacks transfer"
      metadata={requestSession?.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequestMethodCard methods={[request.method]} />
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>ChainId</Text>
          <Text color="$gray400">{chainId}</Text>
        </Col>
      </Row>
      <Divider y={1} />
      <RequestDataCard data={params.request} />
    </RequestModal>
  ) : (
    <Text>Request not found</Text>
  )
}
