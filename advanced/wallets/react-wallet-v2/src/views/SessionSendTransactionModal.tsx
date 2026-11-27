import { useCallback, useEffect, useState } from 'react'
import { Card, Loading, Text } from '@nextui-org/react'
import StyledDivider from '@/components/StyledDivider'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import McpStore, { McpPlanMatch } from '@/store/McpStore'
import { primaryFacts } from '@/components/McpPlanSteps'
import { McpKeyValue } from '@/components/McpUi'
import { useSnapshot } from 'valtio'

import RequestDataCard from '@/components/RequestDataCard'
import RequestDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModal from '@/components/RequestModal'
import MultibridgeRequestModal from '@/components/MultibridgeRequestModal'

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
  const [requiresMultiChain, setRequiresMultiChain] = useState<boolean>(false)
  const [routeTransactions, setRouteTransactions] = useState<Transaction[]>([])
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null)

  // Extract request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const { topic, params } = requestEvent || {}
  const { chainId, request } = params || {}
  const transaction = request?.params[0]

  // Subscribe so the cross-check re-runs when the MCP action advances
  useSnapshot(McpStore.state)
  const planMatch = McpStore.actions.matchPlanTx(topic, transaction)

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
        const caService = new ChainAbstractionService()
        const isMultiChain = await checkMultiChainRequirement(caService, request, chainId)
        if (isMultiChain) {
          await setupRouteTransactions(caService, request, chainId)
        }
      } catch (error) {
        console.error('Error during multi-chain check:', error)
        styledToast('Unable to check multibridge availability', 'error')
      } finally {
        setIsReadyForRender(true)
      }
    }

    initializeMultiChainCheck()
  }, [request, chainId])

  const checkMultiChainRequirement = async (
    caService: ChainAbstractionService,
    request: { params: [{ from: string; to: string; data: string }] },
    chainId: string
  ): Promise<boolean> => {
    const { data, from, to } = request.params[0]
    const isMultiChain = await caService.checkTransaction({
      from,
      to,
      value: '0',
      gas: '0',
      gasPrice: '0',
      data,
      nonce: '0',
      maxFeePerGas: '0',
      maxPriorityFeePerGas: '0',
      chainId
    })
    setRequiresMultiChain(isMultiChain)
    return isMultiChain
  }

  const setupRouteTransactions = async (
    caService: ChainAbstractionService,
    request: { params: [{ from: string; to: string; data: string }] },
    chainId: string
  ): Promise<void> => {
    const { data, from, to } = request.params[0]
    const routeResult = await caService.routeTransaction({
      from,
      to,
      value: '0',
      gas: '0',
      gasPrice: '0',
      data,
      nonce: '0',
      maxFeePerGas: '0',
      maxPriorityFeePerGas: '0',
      chainId
    })
    setRouteTransactions(routeResult.transactions)
    setOrchestrationId(routeResult.orchestrationId)
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

  if (!request || !requestSession) return <Text>Request not found</Text>
  if (!isReadyForRender) return <LoadingComponent />

  return !requiresMultiChain || orchestrationId == null ? (
    <SingleChainModal
      session={requestSession}
      transaction={transaction}
      chainId={chainId || ''}
      method={params?.request?.method || ''}
      planMatch={planMatch}
      onApprove={handleApproval}
      onReject={handleRejection}
      loadingApprove={isLoadingApprove}
      loadingReject={isLoadingReject}
    />
  ) : (
    <MultiChainModal
      transactions={routeTransactions}
      orchestrationId={orchestrationId}
      onReject={handleRejection}
      loadingReject={isLoadingReject}
    />
  )
}

// Extracted Components for Loading, Single-Chain, and Multi-Chain Modals

const LoadingComponent = () => (
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
  /** Whether this request matches the plan prepared on the WalletConnect MCP page */
  planMatch: McpPlanMatch | null
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  loadingApprove: boolean
  loadingReject: boolean
}

const SingleChainModal = ({
  session,
  transaction,
  chainId,
  method,
  planMatch,
  onApprove,
  onReject,
  loadingApprove,
  loadingReject
}: SingleChainModalProps) => (
  <RequestModal
    intention="sign a transaction"
    metadata={session.peer.metadata}
    onApprove={onApprove}
    onReject={onReject}
    approveLoader={{ active: loadingApprove }}
    rejectLoader={{ active: loadingReject }}
  >
    {planMatch ? (
      <Card
        bordered
        borderWeight="light"
        css={{ marginBottom: '$4', borderColor: planMatch.match ? '$success' : '$warning' }}
      >
        <Card.Body css={{ padding: '$5' }}>
          <Text
            size={13}
            color={planMatch.match ? 'success' : 'warning'}
            css={{ marginBottom: planMatch.step ? '$3' : 0 }}
            data-testid="mcp-plan-check"
          >
            {planMatch.match
              ? `Matches step ${planMatch.step?.n ?? '?'} of ${
                  planMatch.total
                } of the action you sent from the MCP page.`
              : 'Does not match any step of the action you sent from the MCP page. Review it before approving.'}
          </Text>
          {planMatch.step ? (
            <>
              <Text size={14} weight="medium" css={{ marginBottom: '$2' }}>
                {planMatch.step.summary}
              </Text>
              {primaryFacts(planMatch.step).map(([label, value]) => (
                <McpKeyValue key={label} label={label} value={value} />
              ))}
            </>
          ) : null}
        </Card.Body>
      </Card>
    ) : null}
    <RequestDataCard data={transaction} />
    <StyledDivider css={{ my: '$4' }} />
    <RequestDetailsCard chains={[chainId]} protocol={session.relay.protocol} />
    <StyledDivider css={{ my: '$4' }} />
    <RequestMethodCard methods={[method]} />
  </RequestModal>
)

type MultiChainModalProps = {
  transactions: Transaction[]
  orchestrationId: string
  onReject: () => Promise<void>
  loadingReject: boolean
}

const MultiChainModal = ({
  transactions,
  orchestrationId,
  onReject,
  loadingReject
}: MultiChainModalProps) => (
  <MultibridgeRequestModal
    transactions={transactions}
    orchestrationId={orchestrationId}
    onReject={onReject}
    rejectLoader={{ active: loadingReject }}
  />
)
