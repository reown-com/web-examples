/* eslint-disable react-hooks/rules-of-hooks */
import { Col, Divider, Row, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { useCallback, useState } from 'react'
import { approveBip122Request, rejectBip122Request } from '@/utils/Bip122RequestHandlerUtil'
import { bip122Wallet } from '@/utils/Bip122WalletUtil'

export default function SessionGetBip122AddressesModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  const { topic, params } = requestEvent
  const { request, chainId } = params
  const account = request.params.account
  const intentions = request.params.intentions
  const addresses = bip122Wallet.getAddresses(intentions)
  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (requestEvent) {
      const response = await approveBip122Request(requestEvent)
      try {
        await walletkit.respondSessionRequest({
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
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectBip122Request(requestEvent)
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
      intention="access your BTC addresses"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      {account && (
        <>
          <Row>
            <Col>
              <Text h5>Addresses for account</Text>
              <Text color="$gray400">{account}</Text>
            </Col>
          </Row>
          <Divider y={1} />
        </>
      )}
      <RequestDataCard data={Object.fromEntries(addresses.entries())} />
    </RequestModal>
  )
}
