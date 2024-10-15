import { useCallback, useState } from 'react'
import { Divider, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { approveBip122Request, rejectBip122Request } from '@/utils/Bip122RequestHandlerUtil'
import { JsonRpcResponse } from '@json-rpc-tools/utils'

export default function SessionSendTransactionBip122Modal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params
  const chainId = params?.chainId
  const request = params?.request
  const transaction = request?.params

  // Handle reject action
  const onReject = useCallback(
    async (rejection?: JsonRpcResponse) => {
      if (requestEvent && topic) {
        setIsLoadingReject(true)
        const response = rejection || rejectBip122Request(requestEvent)
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
    },
    [requestEvent, topic]
  )
  // Handle approve action
  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        const response = await approveBip122Request(requestEvent)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingApprove(false)
        styledToast((e as Error).message, 'error')
        onReject(rejectBip122Request(requestEvent, (e as Error).message))
      }
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [onReject, requestEvent, topic])

  return request && requestSession ? (
    <RequestModal
      intention="sign a transaction"
      metadata={requestSession?.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequestDataCard data={transaction} />
      <Divider y={1} />
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession?.relay.protocol} />
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  ) : (
    <Text>Request not found</Text>
  )
}
