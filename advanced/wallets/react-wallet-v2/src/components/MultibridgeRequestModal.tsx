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
  decodeErc20Transaction,
  getAssetByContractAddress,
  supportedAssets
} from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'

import { styledToast } from '@/utils/HelperUtil'
import { approveEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import { providers } from 'ethers'

interface IProps {
  onReject: () => void
  transactions?: Transaction[]
  orchestrationId:string
  rejectLoader?: LoaderProps
}

export default function MultibridgeRequestModal({
  transactions,
  orchestrationId,
  onReject,
  rejectLoader
}: IProps) {

  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const bridgingTransactions = transactions?.slice(0, transactions.length - 1) || []
  const initialTransaction = transactions?.[transactions.length - 1] 
  const eip155ChainsFundsSourcedFrom = transactions ? new Set(bridgingTransactions.map(transaction => transaction.chainId)) : new Set([])
  console.log({eip155ChainsFundsSourcedFrom})
  const eip155ChainFundsDestination = initialTransaction?.chainId
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params

  const chainId = params?.chainId
  const request = params?.request
  const caService = new ChainAbstractionService();

  // const bridge = useCallback(async () => {
  //   if (!bridgingRequest) {
  //     throw new Error('Bridging request is unavailable')
  //   }

  //   const wallet = await getWallet(params)

  //   const asset = getAssetByContractAddress(bridgingRequest.transfer.contract)
  //   if (!asset) {
  //     throw new Error('Source chain asset unavailable')
  //   }
  //   const sourceChainAssetAddress = supportedAssets[asset][bridgingRequest.sourceChain]
  //   if (!sourceChainAssetAddress) {
  //     throw new Error('Source chain asset address unavailable')
  //   }

  //   await bridgeFunds(
  //     {
  //       fromChainId: bridgingRequest.sourceChain,
  //       toChainId: bridgingRequest.targetChain,
  //       fromAssetAddress: sourceChainAssetAddress,
  //       toAssetAddress: bridgingRequest.transfer.contract,
  //       amount: bridgingRequest.transfer.amount,
  //       userAddress: wallet.getAddress(),
  //       uniqueRoutesPerBridge: true,
  //       sort: 'time',
  //       singleTxOnly: true
  //     },
  //     wallet
  //   )
  // }, [params, bridgingRequest])

  const bridgeRouteFunds = useCallback(async () => {
    if (!transactions) {
      throw new Error('Transactions are unavailable')
    }

    const wallet = await getWallet(params)
    for(const transaction of bridgingTransactions){
      const chainId = transaction.chainId
      const chainProvider = new providers.JsonRpcProvider(
        EIP155_CHAINS[chainId as TEIP155Chain].rpc
      )
      const chainConnectedWallet = await wallet.connect(chainProvider)
      const walletAddress = wallet.getAddress()
      console.log({walletAddress})
      const gasPrice = await chainProvider.getGasPrice();
      console.log({ gasPrice });
        
      console.log('gasEstimation starting: ');
      const gasEstimate = await chainProvider.estimateGas({
        from: walletAddress,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gasPrice: gasPrice,
      });

      const hash = await chainConnectedWallet.sendTransaction({
        from: walletAddress,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gasPrice: gasPrice,
        gasLimit: gasEstimate,
      });
      const receipt = typeof hash === 'string' ? hash : hash?.hash;
      console.log('Transaction broadcasted', { receipt });
    }
    
    // Call the polling function
    try{
      pollOrchestrationStatus(orchestrationId)
    }catch(e){
      console.error(e)
      onReject()
    }
   }, [])


  async function pollOrchestrationStatus(orchestrationId:string, maxAttempts = 100, interval = 1500) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { status } = await caService.getOrchestrationStatus(orchestrationId);
      console.log(attempt,'- Orchestration status:', status);
      if (status === 'completed') {
        console.log('Bridging completed');
        return; // Exit if the status is completed
      }

      // Wait for the specified interval before the next attempt
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.log('Max attempts reached. Orchestration not completed.');
    throw new Error('Max attempts reached. Orchestration not completed.');
  }

  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        await bridgeRouteFunds()
        // await bridge()
        // performance.mark('startInititalTransactionSend')
        // const response = await approveEIP155Request(requestEvent)
        // performance.mark('endInititalTransactionSend')
        // console.log(
        //   `Initial transaction send: ${
        //     performance.measure(
        //       'initial-tx-send',
        //       'startInititalTransactionSend',
        //       'endInititalTransactionSend'
        //     ).duration
        //   } ms`
        // )

        // await walletkit.respondSessionRequest({
        //   topic,
        //   response
        // })
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

  if (!request || !requestSession || !bridgingTransactions || bridgingTransactions.length === 0) {
    return <Text>Request not found</Text>
  }
  const transfer = decodeErc20Transaction(request.params[0])
  if(!transfer) {
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
