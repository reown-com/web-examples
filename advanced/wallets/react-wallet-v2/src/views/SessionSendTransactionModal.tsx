import { Fragment, useState } from 'react'
import { Divider, Modal, Text } from '@nextui-org/react'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { styledToast } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'

export default function SessionSendTransactionModal() {
  const [loading, setLoading] = useState(false)

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required proposal data

  const { topic, params } = requestEvent
  const { request, chainId } = params
  const transaction = request.params[0]

  // Handle approve action
  async function onApprove() {
    if (requestEvent) {
      setLoading(true)
      try {
        const response = await approveEIP155Request(requestEvent)
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        styledToast((e as Error).message, 'error')
        return
      }
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      const response = rejectEIP155Request(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        styledToast((e as Error).message, 'error')
        return
      }
      ModalStore.close()
    }
  }

  return (
    <RequestModal
      intention="sign a transaction"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
    >
      <RequestDataCard data={transaction} />
      <Divider y={1} />
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      <RequestMethodCard methods={[request.method]} />
    </RequestModal>
  )
}
