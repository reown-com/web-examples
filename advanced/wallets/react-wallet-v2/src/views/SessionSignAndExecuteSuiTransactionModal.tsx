/* eslint-disable react-hooks/rules-of-hooks */
import { Col, Divider, Row, Text } from '@nextui-org/react'
import { useCallback, useMemo, useState } from 'react'

import RequesDetailsCard from '@/components/RequestDetalilsCard'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { getWallet, suiAddresses } from '@/utils/SuiWalletUtil'
import { approveSuiRequest, rejectSuiRequest } from '@/utils/SuiRequestHandlerUtil'

export default function SessionSignSuiAndExecuteTransactionModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const [transaction, setTransaction] = useState<string | undefined>(undefined)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params

  // transaction is a base64 encoded BCS transaction
  useMemo(async () => {
    if (transaction) return
    const wallet = await getWallet()
    const jsonTx = await wallet.getJsonTransactionFromBase64(request.params.transaction)
    setTransaction(jsonTx?.toString())
  }, [request.params, transaction])

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent) {
        setIsLoadingApprove(true)
        const response = await approveSuiRequest(requestEvent)
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
      const response = rejectSuiRequest(requestEvent)
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
      intention="sign and execute a transaction"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <Row>
        <Col>
          <Text h5>Sign with Address</Text>
          <Text color="$gray400" data-testid="request-detauls-realy-protocol">
            {suiAddresses[0]}
          </Text>
        </Col>
      </Row>
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Method</Text>
          <Text color="$gray400" data-testid="request-detauls-realy-protocol">
            {request.method}
          </Text>
        </Col>
      </Row>
      <Divider y={1} />
      <RequesDetailsCard chains={[chainId ?? '']} />
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Transaction details</Text>
          <Text color="$gray400" data-testid="request-message-text">
            <code>{transaction}</code>
          </Text>
        </Col>
      </Row>
    </RequestModal>
  )
}
