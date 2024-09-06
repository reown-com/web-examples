import { LoaderProps } from '@/components/ModalFooter'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import { Divider, Text } from '@nextui-org/react'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { useCallback, useEffect, useState } from 'react'
import {
  bridgeFunds,
  BridgingRequest,
  getAssetByContractAddress,
  supportedAssets
} from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { providers } from 'ethers'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { styledToast } from '@/utils/HelperUtil'

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
  const transaction = request?.params[0]

  const bridge = useCallback(async () => {
    if (!bridgingRequest) {
      throw new Error('Bridging request is unavailable')
    }

    const wallet = await getWallet(params)
    const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)

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
      wallet,
      provider
    )
  }, [params, chainId, bridgingRequest])

  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        await bridge()
      } catch (e) {
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

  return (
    <RequestModal
      intention="Multibridge"
      metadata={requestSession?.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={rejectLoader}
    >
      <RequestDataCard data={transaction} />
      <Divider y={1} />
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession?.relay.protocol} />
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
