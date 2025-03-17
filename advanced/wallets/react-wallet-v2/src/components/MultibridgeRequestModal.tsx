import { useCallback, useState } from 'react'
import { Avatar, Col, Divider, Row, Text } from '@nextui-org/react'
import { LoaderProps } from '@/components/ModalFooter'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { approveEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import {
  convertTokenBalance,
  decodeErc20Transaction,
  getAssetByContractAddress
} from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import { providers } from 'ethers'
import { formatJsonRpcError } from '@json-rpc-tools/utils'

interface IProps {
  onReject: () => void
  transactions?: Transaction[]
  orchestrationId: string
  rejectLoader?: LoaderProps
}

export default function MultibridgeRequestModal({
  transactions,
  orchestrationId,
  onReject,
  rejectLoader
}: IProps) {
  const [isLoadingApprove, setIsLoadingApprove] = useState<boolean>(false)

  const bridgingTransactions = transactions?.slice(0, transactions.length - 1) || []
  const initialTransaction = transactions?.[transactions.length - 1]

  const eip155ChainsFundsSourcedFrom = transactions
    ? new Set(bridgingTransactions.map(transaction => transaction.chainId))
    : new Set<TEIP155Chain>()

  const eip155ChainFundsDestination = initialTransaction?.chainId

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params

  const chainId = params?.chainId
  const request = params?.request
  const caService = new ChainAbstractionService()

  const bridgeFunds = useCallback(async (): Promise<void> => {
    if (!bridgingTransactions) {
      throw new Error('bridgingTransactions are unavailable')
    }

    const wallet = await getWallet(params)
    console.log(
      'Bridge funds from',
      eip155ChainsFundsSourcedFrom,
      'to',
      eip155ChainFundsDestination
    )

    for (const transaction of bridgingTransactions) {
      console.log('Bridging transaction', transaction)
      const chainId = transaction.chainId
      const chainProvider = new providers.JsonRpcProvider(
        EIP155_CHAINS[chainId as TEIP155Chain].rpc
      )
      const chainConnectedWallet = await wallet.connect(chainProvider)
      const walletAddress = wallet.getAddress()

      const txResponse = await chainConnectedWallet.sendTransaction({
        from: walletAddress,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        nonce: transaction.nonce,
        gasPrice: transaction.gasPrice,
        gasLimit: transaction.gas
      })
      const txHash = typeof txResponse === 'string' ? txResponse : txResponse?.hash
      const txReceipt = await txResponse.wait()
      const txStatus = txReceipt.status
      console.log(
        `Transaction broadcasted on chain ${chainId} , ${{ txHash }}, status: ${txStatus}`
      )
    }
    await pollOrchestrationStatus(orchestrationId)
  }, [bridgingTransactions, orchestrationId, onReject, params])

  async function pollOrchestrationStatus(
    orchestrationId: string,
    maxAttempts = 100,
    interval = 1500
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { status } = await caService.getOrchestrationStatus(orchestrationId)
      console.log(attempt, '- Orchestration status:', status)
      if (status === 'completed') {
        console.log('Bridging completed')
        return
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    console.log('Max attempts reached. Orchestration not completed.')
    throw new Error('Max attempts reached. Orchestration not completed.')
  }

  const onApprove = useCallback(async (): Promise<void> => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        performance.mark('startInititalTransactionSend')
        await bridgeFunds()
        const response = await approveEIP155Request(requestEvent)
        performance.mark('endInititalTransactionSend')
        console.log(
          `Initial transaction send: ${
            performance.measure(
              'initial-tx-send',
              'startInititalTransactionSend',
              'endInititalTransactionSend'
            ).duration
          } ms`
        )

        await walletkit.respondSessionRequest({ topic, response })
      } catch (e) {
        const { id } = requestEvent
        const errorMessage = (e as Error).message || 'Error bridging funds'
        const response = formatJsonRpcError(id, errorMessage)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
        styledToast((e as Error).message, 'error')
        console.error(e)
      } finally {
        setIsLoadingApprove(false)
      }
      ModalStore.close()
    }
  }, [bridgeFunds, requestEvent, topic])

  if (!request || !requestSession || !bridgingTransactions || bridgingTransactions.length === 0) {
    return <Text>Request not found</Text>
  }

  const transfer = decodeErc20Transaction(request.params[0])
  if (!transfer) {
    return <Text>Invalid transfer request</Text>
  }

  const asset = getAssetByContractAddress(transfer.contract)
  const amount = convertTokenBalance(asset, transfer.amount)
  const destination = transfer.to
  const sourceChain = EIP155_CHAINS[Array.from(eip155ChainsFundsSourcedFrom)[0] as TEIP155Chain]
  const targetChain = EIP155_CHAINS[eip155ChainFundsDestination as TEIP155Chain]

  return (
    <RequestModal
      intention="Multibridge"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={rejectLoader}
      disableThreatDetection={true}
    >
      <Row>
        <Col>
          <Text h5>Transaction details</Text>
          <Text
            color=""
            data-testid="request-details-chain"
            css={{ paddingTop: '$6', paddingBottom: '$6' }}
          >
            Sending {amount} {asset} to:
          </Text>
          <Text color="$gray400" data-testid="request-details-chain" size="sm">
            {destination}
          </Text>
        </Col>
      </Row>
      <Divider y={1} />
      <Row>
        <Col>
          <Text h5>Chain details</Text>
          <Text color="">Target chain:</Text>
          <Row align="center" css={{ marginTop: '$6' }}>
            <Col>
              <Avatar src={targetChain.logo} />
            </Col>
            <Col>{targetChain.name}</Col>
          </Row>

          <Text color="">Sourcing funds from:</Text>
          <Row align="center" css={{ marginTop: '$6' }}>
            <Col>
              <Avatar src={sourceChain.logo} />
            </Col>
            <Col>{sourceChain.name}</Col>
          </Row>
        </Col>
      </Row>
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
