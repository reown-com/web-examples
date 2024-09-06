import { useCallback, useEffect, useState } from 'react'
import { Card, Divider, Loading, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from '@/components/RequestModal'
import {
  BridgingRequest,
  decodeErc20Transaction,
  getCrossChainTokens,
  getErc20TokenBalance
} from '@/utils/MultibridgeUtil'
import MultibridgeRequestModal from '@/components/MultibridgeRequestModal'
import SettingsStore from '@/store/SettingsStore'

export default function SessionSendTransactionModal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const [isTypeResolved, setIsTypeResolved] = useState(false)
  const [shouldUseMultibridge, setShouldUseMultibridge] = useState(false)
  const [bridgingRequest, setBirdgingRequest] = useState<BridgingRequest>()

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params
  const chainId = params?.chainId
  const request = params?.request
  const transaction = request?.params[0]

  useEffect(() => {
    const multibridgeCheck = async () => {
      setIsTypeResolved(false)
      try {
        if (!request) {
          setIsTypeResolved(true)
          return
        }
        if (!SettingsStore.state.chainAbstractionEnabled) {
          setIsTypeResolved(true)
          return
        }
        const transfer = decodeErc20Transaction(request.params[0])
        if (!transfer) {
          setIsTypeResolved(true)
          return
        }
        const parsedChainId = chainId?.split(':')[1]
        const tokenBalance = await getErc20TokenBalance(
          transfer.contract,
          Number(parsedChainId),
          transfer.from,
          false
        )
        if (transfer.amount <= tokenBalance) {
          setIsTypeResolved(true)
          return
        }
        const otherTokens = getCrossChainTokens(transfer.contract)
        let otherBalance = 0
        let otherChain = 0

        for (const chain in otherTokens) {
          const balance = await getErc20TokenBalance(
            otherTokens[Number(chain)],
            Number(chain),
            transfer.from,
            false
          )
          if (balance >= transfer.amount) {
            otherBalance = balance
            otherChain = Number(chain)

            console.log('Found chain to bridge from', {
              otherBalance,
              requiredBalance: transfer.amount,
              otherChain
            })
            const bridgingRequest = {
              transfer,
              sourceChain: otherChain,
              targetChain: Number(parsedChainId)
            }
            console.log({ bridgingRequest })
            setBirdgingRequest(bridgingRequest)
            setShouldUseMultibridge(true)
            setIsTypeResolved(true)
            return
          }
        }
      } catch (error) {
        console.log('Unable to check multibridge availability', error)
      } finally {
        setIsTypeResolved(true)
      }
    }
    multibridgeCheck()
  }, [request, chainId])

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        const response = await approveEIP155Request(requestEvent)
        await web3wallet.respondSessionRequest({
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
    if (requestEvent && topic) {
      setIsLoadingReject(true)
      const response = rejectEIP155Request(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
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

  if (!request || !requestSession) {
    return <Text>Request not found</Text>
  }

  if (!isTypeResolved) {
    return (
      <Card>
        <Card.Body css={{ paddingTop: '$20', paddingBottom: '$20' }}>
          <Loading type="points"></Loading>
        </Card.Body>
      </Card>
    )
  }

  return !shouldUseMultibridge && isTypeResolved ? (
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
    <MultibridgeRequestModal
      bridgingRequest={bridgingRequest}
      onReject={onReject}
      rejectLoader={{ active: isLoadingReject }}
    />
  )
}
