import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Divider, Loading, Row, Text } from '@nextui-org/react'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'

import RequestDataCard from '@/components/RequestDataCard'
import RequestDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModal from '@/components/RequestModal'
import MultibridgeRequestModal from '@/components/MultibridgeRequestModal'
import { ChainAbstractionTypes } from '@reown/walletkit'

// Types for props used in individual components
type Session = {
  peer: {
    metadata: { name: string; description: string; url: string; icons: string[] }
  }
  relay: { protocol: string }
}

export default function SessionSendTransactionModal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState<boolean>(false)
  const [isLoadingReject, setIsLoadingReject] = useState<boolean>(false)
  const [isReadyForRender, setIsReadyForRender] = useState<boolean>(false)
  useState<ChainAbstractionTypes.InitialTransactionMetadata>()
  const [bridgeDetails, setBridgeDetails] = useState<ChainAbstractionTypes.UiFields | undefined>()
  const [chainAbstractionStatus, setChainAbstractionStatus] = useState<string>('')
  // Extract request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const { topic, params } = requestEvent || {}
  const { chainId, request } = params || {}
  const transaction = request?.params[0]
  // Check for multi-chain requirement and handle routing
  useEffect(() => {
    const initializeMultiChainCheck = async (): Promise<void> => {
      setIsReadyForRender(false)

      if (!chainId) {
        console.error('Chain ID is not available')
        setIsReadyForRender(true)
        return
      }

      if (!SettingsStore.state.chainAbstractionEnabled || !request) {
        setIsReadyForRender(true)
        return
      }

      try {
        // const caService = new ChainAbstractionService()
        // const isMultiChain = await checkMultiChainRequirement(caService, request, chainId)
        // if (isMultiChain) {
        await setupRouteTransactions(request, chainId)
        // }
      } catch (error) {
        console.error('Error during multi-chain check:', error)
        styledToast('Unable to check multibridge availability', 'error')
      } finally {
        setIsReadyForRender(true)
      }
    }

    initializeMultiChainCheck()
  }, [request, chainId])

  const setupRouteTransactions = async (
    // caService: ChainAbstractionService,
    request: {
      params: [
        {
          from: ChainAbstractionTypes.Hex
          to: ChainAbstractionTypes.Hex
          data: ChainAbstractionTypes.Hex
        }
      ]
    },
    chainId: string
  ): Promise<void> => {
    const { data, from, to } = request.params[0]

    const result = await walletkit.chainAbstraction.prepareDetailed({
      transaction: {
        from,
        to,
        input: data,
        chainId
      }
    })

    console.log('prepare detaield result:', result)
    if ('error' in result) {
      setChainAbstractionStatus(result.error.error)
    }

    if (!('success' in result)) {
      return
    }

    if ('notRequired' in result.success) {
      setChainAbstractionStatus('not required')
    }

    if ('available' in result.success) {
      setChainAbstractionStatus('available')
      setBridgeDetails(result.success.available)
    }
  }

  const handleApproval = useCallback(async (): Promise<void> => {
    if (!requestEvent || !topic) return
    setIsLoadingApprove(true)
    try {
      const response = await approveEIP155Request(requestEvent)
      await walletkit.respondSessionRequest({ topic, response })
      ModalStore.close()
    } catch (error) {
      styledToast((error as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
    }
  }, [requestEvent, topic])

  const handleRejection = useCallback(async (): Promise<void> => {
    if (!requestEvent || !topic) return
    setIsLoadingReject(true)
    try {
      const response = rejectEIP155Request(requestEvent)
      await walletkit.respondSessionRequest({ topic, response })
      ModalStore.close()
    } catch (error) {
      styledToast((error as Error).message, 'error')
    } finally {
      setIsLoadingReject(false)
    }
  }, [requestEvent, topic])

  if (!requestEvent) return <Text>Request not found</Text>
  if (!isReadyForRender) return <LoadingComponent />

  return bridgeDetails ? (
    <MultiChainModal
      onReject={handleRejection}
      loadingReject={isLoadingReject}
      bridgeDetails={bridgeDetails}
    />
  ) : (
    <SingleChainModal
      session={requestSession!}
      transaction={transaction}
      chainId={chainId || ''}
      method={params?.request?.method || ''}
      onApprove={handleApproval}
      onReject={handleRejection}
      loadingApprove={isLoadingApprove}
      loadingReject={isLoadingReject}
      chainAbstractionStatus={chainAbstractionStatus}
    />
  )
}

// Extracted Components for Loading, Single-Chain, and Multi-Chain Modals

const LoadingComponent = (): JSX.Element => (
  <Card>
    <Card.Body css={{ paddingTop: '$20', paddingBottom: '$20' }}>
      <Loading type="points" />
    </Card.Body>
  </Card>
)

type SingleChainModalProps = {
  session: Session
  transaction: any
  chainId: string
  method: string
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  loadingApprove: boolean
  loadingReject: boolean
  chainAbstractionStatus: string
}

const SingleChainModal = ({
  session,
  transaction,
  chainId,
  method,
  onApprove,
  onReject,
  loadingApprove,
  loadingReject,
  chainAbstractionStatus
}: SingleChainModalProps): JSX.Element => (
  <RequestModal
    intention="sign a transaction"
    metadata={session.peer.metadata}
    onApprove={onApprove}
    onReject={onReject}
    approveLoader={{ active: loadingApprove }}
    rejectLoader={{ active: loadingReject }}
  >
    <Divider y={1} />
    <Row>
      <Col>
        <Text h5>Chain Abstraction Status</Text>
        <Text color="$gray400" data-testid="request-methods">
          {chainAbstractionStatus}
        </Text>
      </Col>
    </Row>
    <RequestDataCard data={transaction} />
    <Divider y={1} />
    <RequestDetailsCard chains={[chainId]} protocol={session.relay.protocol} />
    <Divider y={1} />
    <RequestMethodCard methods={[method]} />
  </RequestModal>
)

type MultiChainModalProps = {
  onReject: () => Promise<void>
  loadingReject: boolean
  bridgeDetails: ChainAbstractionTypes.UiFields
}

const MultiChainModal = ({
  onReject,
  loadingReject,
  bridgeDetails
}: MultiChainModalProps): JSX.Element => (
  <MultibridgeRequestModal
    onReject={onReject}
    rejectLoader={{ active: loadingReject }}
    bridgeDetails={bridgeDetails}
  />
)
