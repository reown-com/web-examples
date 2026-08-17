/* eslint-disable react-hooks/rules-of-hooks */
import { Text } from '@nextui-org/react'
import StyledDivider from '@/components/StyledDivider'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { approveStellarRequest, rejectStellarRequest } from '@/utils/StellarRequestHandlerUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { STELLAR_SIGNING_METHODS } from '@/data/StellarData'
import RequestModal from '../components/RequestModal'
import { useCallback, useState } from 'react'

const METHOD_INTENTIONS: Record<string, string> = {
  [STELLAR_SIGNING_METHODS.STELLAR_SIGN_XDR]: 'sign a Stellar transaction',
  [STELLAR_SIGNING_METHODS.STELLAR_SIGN_AND_SUBMIT_XDR]: 'sign and submit a Stellar transaction',
  [STELLAR_SIGNING_METHODS.STELLAR_SIGN_MESSAGE]: 'sign a Stellar message',
  [STELLAR_SIGNING_METHODS.STELLAR_SIGN_AUTH_ENTRY]: 'sign a Stellar authorization entry'
}

export default function SessionSignStellarModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params
  const intention = METHOD_INTENTIONS[request.method] ?? 'sign a Stellar request'

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent) {
        setIsLoadingApprove(true)
        const response = await approveStellarRequest(requestEvent)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
      }
    } catch (e) {
      styledToast((e as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectStellarRequest(requestEvent)
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

  return (
    <RequestModal
      intention={intention}
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <StyledDivider css={{ my: '$4' }} />
      <RequestDataCard data={params} />
      <StyledDivider css={{ my: '$4' }} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
