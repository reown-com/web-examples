import { useCallback, useEffect, useState } from 'react'
import { Card, Divider, Loading, Text } from '@nextui-org/react'

import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from '@/components/RequestModal'
import MultibridgeRequestModal from '@/components/MultibridgeRequestModal'
import SettingsStore from '@/store/SettingsStore'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import { getChainById } from '@/utils/ChainUtil'

export default function SessionSendTransactionModal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const [isTypeResolved, setIsTypeResolved] = useState(false)
  const [requiresMultiChain, setRequiresMultiChain] = useState(false)
  const [routeTransactions, setRouteTransactions] = useState<Transaction[]>([])
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null)
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
      if(!chainId){
        throw new Error('Chain ID is not available')
      }
      console.log({chainId: chainId.split(':')[1]})
      const chain = getChainById(parseInt(chainId.split(':')[1]))
      try {
        if (!request) {
          setIsTypeResolved(true)
          return
        }
        console.log({chain})

        if (!SettingsStore.state.chainAbstractionEnabled) {
          setIsTypeResolved(true)
          return
        }

        const {
          data,
          from,
          to
        } = request.params[0]
        
        const caService = new ChainAbstractionService()
        const isRequiresMultiChain = await caService.checkTransaction({
          from: from,
          to: to,
          value: '0',
          gas: '0',
          gasPrice: '0',
          data: data,
          nonce: '0',
          maxFeePerGas: '0',
          maxPriorityFeePerGas: '0',
          chainId: chainId
        })
        console.log('Checking multibridge availability', {isRequiresMultiChain})
        if(isRequiresMultiChain){
          const routeTransactions = await caService.routeTransaction({
            from: from,
            to: to,
            value: '0',
            gas: '0',
            gasPrice: '0',
            data: data,
            nonce: '0',
            maxFeePerGas: '0',
            maxPriorityFeePerGas: '0',
            chainId: chainId
          })
          const status = await caService.getOrchestrationStatus(routeTransactions.orchestrationId)
          console.log('Orchestration status', status)
          console.log('Route transactions', routeTransactions) 
          setRequiresMultiChain(isRequiresMultiChain)
          setRouteTransactions(routeTransactions.transactions)
          setOrchestrationId(routeTransactions.orchestrationId)
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
    try {
      if (requestEvent && topic) {
        setIsLoadingApprove(true)
        const response = await approveEIP155Request(requestEvent)
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
    if (requestEvent && topic) {
      setIsLoadingReject(true)
      const response = rejectEIP155Request(requestEvent)
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

  return !requiresMultiChain && isTypeResolved || (orchestrationId === null || orchestrationId === undefined) ? (
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
      transactions={routeTransactions}
      orchestrationId={orchestrationId} 
      onReject={onReject}
      rejectLoader={{ active: isLoadingReject }}
    />
  );
}
