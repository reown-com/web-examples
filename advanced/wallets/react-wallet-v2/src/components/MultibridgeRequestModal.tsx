import { LoaderProps } from '@/components/ModalFooter'

import RequestMethodCard from '@/components/RequestMethodCard'
import { Avatar, Col, Container, Divider, Row, Text } from '@nextui-org/react'
import { walletkit } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { useCallback, useState } from 'react'
import {
  bridgeFunds,
  BridgingRequest,
  convertTokenBalance,
  getAssetByContractAddress,
  supportedAssets
} from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'

import { styledToast } from '@/utils/HelperUtil'
import { approveEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'

interface IProps {
  onReject: () => void
  bridgingRequest?: BridgingRequest
  rejectLoader?: LoaderProps
}

export default function MultibridgeRequestModal({
  bridgingRequest,
  onReject,
  rejectLoader
}: IProps) {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params

  const chainId = params?.chainId
  const request = params?.request

  const bridge = useCallback(async () => {
    if (!bridgingRequest) {
      throw new Error('Bridging request is unavailable')
    }

    const wallet = await getWallet(params)

    const asset = getAssetByContractAddress(bridgingRequest.transfer.contract)
    if (!asset) {
      throw new Error('Source chain asset unavailable')
    }
    const sourceChainAssetAddress = supportedAssets[asset][bridgingRequest.sourceChain]
    if (!sourceChainAssetAddress) {
      throw new Error('Source chain asset address unavailable')
    }

    await bridgeFunds(
      {
        fromChainId: bridgingRequest.sourceChain,
        toChainId: bridgingRequest.targetChain,
        fromAssetAddress: sourceChainAssetAddress,
        toAssetAddress: bridgingRequest.transfer.contract,
        amount: bridgingRequest.transfer.amount,
        userAddress: wallet.getAddress(),
        uniqueRoutesPerBridge: true,
        sort: 'time',
        singleTxOnly: true
      },
      wallet
    )
  }, [params, bridgingRequest])

  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        await bridge()
        performance.mark('startInititalTransactionSend')
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

        await walletkit.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        console.log('Error')
        console.error(e)

        setIsLoadingApprove(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  if (!request || !requestSession || !bridgingRequest) {
    return <Text>Request not found</Text>
  }

  const asset = getAssetByContractAddress(bridgingRequest.transfer.contract)
  const amount = convertTokenBalance(asset, bridgingRequest.transfer.amount)
  const destination = bridgingRequest.transfer.to
  const sourceChain = EIP155_CHAINS[`eip155:${bridgingRequest.sourceChain}` as TEIP155Chain]
  const targetChain = EIP155_CHAINS[`eip155:${bridgingRequest.targetChain}` as TEIP155Chain]

  return (
    <RequestModal
      intention="Multibridge"
      metadata={requestSession?.peer.metadata}
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
