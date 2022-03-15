import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { approveSolanaRequest, rejectSolanaRequest } from '@/utils/SolanaRequestHandlerUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SessionSignSolanaModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { method, params } = requestEvent.request

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      const response = await approveSolanaRequest(requestEvent)
      await walletConnectClient.respond({
        topic: requestEvent.topic,
        response
      })
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      const response = rejectSolanaRequest(requestEvent.request)
      await walletConnectClient.respond({
        topic: requestEvent.topic,
        response
      })
      ModalStore.close()
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Sign Message">
        <ProjectInfoCard metadata={requestSession.peer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard
          chains={[requestEvent.chainId ?? '']}
          protocol={requestSession.relay.protocol}
        />

        <Divider y={2} />

        <RequestDataCard data={params} />

        <Divider y={2} />

        <RequestMethodCard methods={[method]} />
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          Reject
        </Button>
        <Button auto flat color="success" onClick={onApprove}>
          Approve
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
