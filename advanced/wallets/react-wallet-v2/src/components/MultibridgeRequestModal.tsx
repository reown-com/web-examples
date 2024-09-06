import { LoaderProps } from '@/components/ModalFooter'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import { Divider, Text } from '@nextui-org/react'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { useCallback, useEffect } from 'react'
import { bridgeFunds } from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { providers } from 'ethers'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'

interface IProps {
  onApprove: () => void
  onReject: () => void
  approveLoader?: LoaderProps
  rejectLoader?: LoaderProps
}

export default function MultibridgeRequestModal({
  onApprove,
  onReject,
  approveLoader,
  rejectLoader
}: IProps) {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const params = requestEvent?.params

  const chainId = params?.chainId
  const request = params?.request
  const transaction = request?.params[0]

  const brdige = useCallback(async () => {
    const wallet = await getWallet(params)
    const provider = new providers.JsonRpcProvider(EIP155_CHAINS[chainId as TEIP155Chain].rpc)

    await bridgeFunds(
      {
        fromChainId: 8453,
        toChainId: 42161,
        fromAssetAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        toAssetAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: 500000, // 0.5
        userAddress: '0x81D8C68Be5EcDC5f927eF020Da834AA57cc3Bd24',
        uniqueRoutesPerBridge: true,
        sort: 'time',
        singleTxOnly: true
      },
      wallet,
      provider
    )
  }, [params, chainId])

  if (!request || !requestSession) {
    return <Text>Request not found</Text>
  }

  return (
    <RequestModal
      intention="Multibridge"
      metadata={requestSession?.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={approveLoader}
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
