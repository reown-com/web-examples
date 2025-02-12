import { useCallback, useEffect, useState } from 'react'
import { Card, Divider, Loading, Text } from '@nextui-org/react'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'

import RequestDataCard from '@/components/RequestDataCard'
import RequestDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModal from '@/components/RequestModal'
import MultibridgeRequestModal from '@/components/MultibridgeRequestModal'
import { ChainAbstractionTypes, WalletKitTypes } from '@reown/walletkit'

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
  const [initialTransaction, setInitialTransaction] = useState<Transaction>()
  const [fundings, setFundings] = useState<ChainAbstractionTypes.FundingFrom[]>()
  const [initialTransactionMetadata, setInitialTransactionMetadata] =
    useState<ChainAbstractionTypes.InitialTransactionMetadata>()
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
    request: { params: [{ from: string; to: string; data: string }] },
    chainId: string
  ): Promise<void> => {
    const { data, from, to } = request.params[0]

    const result = await walletkit.prepareFulfilment({
      transaction: {
        to,
        from,
        data,
        chainId
      }
    })

    // const result = {
    //   status: 'available',
    //   data: {
    //     fulfilmentId: 'e20881f7-df15-4b99-9d72-8456dc0f4662',
    //     transactions: [
    //       {
    //         chainId: 'eip155:8453',
    //         from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //         to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    //         value: '0x0',
    //         input:
    //           '0x095ea7b30000000000000000000000003a23f943181408eac424116af7b7790c94cb97a50000000000000000000000000000000000000000000000000000000000225928',
    //         gasLimit: '0x1b760',
    //         nonce: '0x17'
    //       },
    //       {
    //         chainId: 'eip155:8453',
    //         from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //         to: '0x3a23f943181408eac424116af7b7790c94cb97a5',
    //         value: '0x0',
    //         input:
    //           '0x0000019b792ebcb90000000000000000000000000000000000000000000000000000000000225928000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000001c2f0000000000000000000000000000000000000000000000000000000000001b3b000000000000000000000000000000000000000000000000000000000000000200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000223cf9000000000000000000000000000000000000000000000000000000000000a4b1000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000679b390b00000000000000000000000000000000000000000000000000000000679b8d11d00dfeeddeadbeef765753be7f7a64d5509974b0d678e1e3149b02f4',
    //         gasLimit: '0x1a584',
    //         nonce: '0x18'
    //       }
    //     ],
    //     funding: [
    //       {
    //         chainId: 'eip155:8453',
    //         tokenContract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    //         symbol: 'USDC',
    //         amount: '0x223cf9',
    //         bridgingFee: '0xb729d',
    //         decimals: 6
    //       }
    //     ],
    //     initialTransaction: {
    //       chainId: 'eip155:42161',
    //       from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //       to: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    //       value: '0x0',
    //       input:
    //         '0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900',
    //       gasLimit: '0x1913a',
    //       nonce: '0x4b'
    //     },
    //     initialTransactionMetadata: {
    //       transferTo: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //       amount: '0x3d0900',
    //       tokenContract: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    //       symbol: 'USDC',
    //       decimals: 6
    //     }
    //   }
    // }
    console.log('Fulfilment result:', result)
    if (result.status === 'available') {
      const routes = result.data.transactions.map(tx => ({
        ...tx,
        data: tx.input
      }))
      setFundings(result.data.funding)
      setRouteTransactions(routes)
      setOrchestrationId(result.data.fulfilmentId)
      setRequiresMultiChain(true)
      setInitialTransaction({
        to: result.data.initialTransaction.to,
        from: result.data.initialTransaction.from,
        value: result.data.initialTransaction.value,
        data: result.data.initialTransaction.input,
        nonce: result.data.initialTransaction.nonce,
        maxFeePerGas: result.data.initialTransaction.maxFeePerGas,
        maxPriorityFeePerGas: result.data.initialTransaction.maxPriorityFeePerGas,
        chainId: result.data.initialTransaction.chainId,
        gasLimit: result.data.initialTransaction.gasLimit
      })
      setInitialTransactionMetadata(result.data.initialTransactionMetadata)
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

  return !requiresMultiChain || orchestrationId == null ? (
    <SingleChainModal
      session={requestSession!}
      transaction={transaction}
      chainId={chainId || ''}
      method={params?.request?.method || ''}
      onApprove={handleApproval}
      onReject={handleRejection}
      loadingApprove={isLoadingApprove}
      loadingReject={isLoadingReject}
    />
  ) : (
    <MultiChainModal
      transactions={routeTransactions}
      orchestrationId={orchestrationId}
      initialTransaction={initialTransaction!}
      onReject={handleRejection}
      loadingReject={isLoadingReject}
      fundings={fundings!}
      initialTransactionMetadata={initialTransactionMetadata!}
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
}

const SingleChainModal = ({
  session,
  transaction,
  chainId,
  method,
  onApprove,
  onReject,
  loadingApprove,
  loadingReject
}: SingleChainModalProps): JSX.Element => (
  <RequestModal
    intention="sign a transaction"
    metadata={session.peer.metadata}
    onApprove={onApprove}
    onReject={onReject}
    approveLoader={{ active: loadingApprove }}
    rejectLoader={{ active: loadingReject }}
  >
    <RequestDataCard data={transaction} />
    <Divider y={1} />
    <RequestDetailsCard chains={[chainId]} protocol={session.relay.protocol} />
    <Divider y={1} />
    <RequestMethodCard methods={[method]} />
  </RequestModal>
)

type MultiChainModalProps = {
  transactions: Transaction[]
  initialTransaction: Transaction
  orchestrationId: string
  onReject: () => Promise<void>
  loadingReject: boolean
  fundings: ChainAbstractionTypes.FundingFrom[]
  initialTransactionMetadata: ChainAbstractionTypes.InitialTransactionMetadata
}

const MultiChainModal = ({
  transactions,
  initialTransaction,
  orchestrationId,
  onReject,
  loadingReject,
  fundings,
  initialTransactionMetadata
}: MultiChainModalProps): JSX.Element => (
  <MultibridgeRequestModal
    transactions={transactions}
    initialTransaction={initialTransaction}
    orchestrationId={orchestrationId}
    onReject={onReject}
    rejectLoader={{ active: loadingReject }}
    fundings={fundings}
    initialTransactionMetadata={initialTransactionMetadata}
  />
)
