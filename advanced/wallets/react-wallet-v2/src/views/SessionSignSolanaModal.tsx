/* eslint-disable react-hooks/rules-of-hooks */
import { Divider, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { approveSolanaRequest, rejectSolanaRequest } from '@/utils/SolanaRequestHandlerUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { useCallback, useMemo, useState } from 'react'
import { SOLANA_SIGNING_METHODS } from '@/data/SolanaData'
import { base58 } from 'ethers/lib/utils'

export default function SessionSignSolanaModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent) {
    return <Text>Missing request data</Text>
  }

  const requestSession = walletkit.getActiveSessions()[requestEvent.topic]

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params

  const messageToSign = useMemo(() => {
    try {
      if (request.method === SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE) {
        return Buffer.from(base58.decode(request.params.message)).toString('utf-8')
      }
    } catch (e) {
      return undefined
    }
    return undefined
  }, [request, params])

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent) {
        setIsLoadingApprove(true)
        const response = await approveSolanaRequest(requestEvent)
        console.log('approve solana request', topic, requestSession.topic)
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
      const response = rejectSolanaRequest(requestEvent)
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
      intention="sign a Solana message"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      {messageToSign ? (
        <code color="$gray400" data-testid="request-message-text">
          {messageToSign}
        </code>
      ) : (
        <RequestDataCard data={params} />
      )}
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
