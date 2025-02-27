/* eslint-disable react-hooks/rules-of-hooks */
import { Divider, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { getSignTypedDataParamsData, styledToast } from '@/utils/HelperUtil'
import { walletKit } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'
import { useCallback, useState } from 'react'
import PermissionDetailsCard from '@/components/PermissionDetailsCard'
import { useAppKitProvider } from '@reown/appkit/react'
import { W3mFrameProvider } from '@reown/appkit-wallet'

export default function SessionSignTypedDataModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const { walletProvider } = useAppKitProvider<W3mFrameProvider>('eip155')


  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params
  let method = request.method
  // Get data
  const data = getSignTypedDataParamsData(request.params)

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (requestEvent && topic && walletProvider) {
      setIsLoadingApprove(true)
      const response = await approveEIP155Request(requestEvent, walletProvider)
      try {
        await walletKit.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingApprove(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic, walletProvider])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectEIP155Request(requestEvent)
      try {
        await walletKit.respondSessionRequest({
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
  return (
    <RequestModal
      intention="sign a message"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      <RequestMethodCard methods={[method]} />
    </RequestModal>
  )
}
