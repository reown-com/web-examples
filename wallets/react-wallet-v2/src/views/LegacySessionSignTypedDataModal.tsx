import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestDataCard from '@/components/RequestDataCard'
import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import { approveEIP155Request, rejectEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import { getSignTypedDataParamsData } from '@/utils/HelperUtil'
import { legacySignClient } from '@/utils/LegacyWalletConnectUtil'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function LegacySessionSignTypedDataModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.legacyCallRequestEvent
  const requestSession = ModalStore.state.data?.legacyRequestSession

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { id, method, params } = requestEvent

  // Get data
  const data = getSignTypedDataParamsData(params)

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (requestEvent) {
      const { result } = await approveEIP155Request({
        id,
        topic: '',
        params: { request: { method, params }, chainId: '1' }
      })

      legacySignClient.approveRequest({
        id,
        result
      })
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (requestEvent) {
      const { error } = rejectEIP155Request({
        id,
        topic: '',
        params: { request: { method, params }, chainId: '1' }
      })
      legacySignClient.rejectRequest({
        id,
        error
      })
      ModalStore.close()
    }
  }

  return (
    <Fragment>
      <RequestModalContainer title="Sign Typed Data">
        <ProjectInfoCard metadata={requestSession.peerMeta!} />

        <Divider y={2} />

        <RequesDetailsCard
          chains={['eip155:' + legacySignClient.chainId]}
          protocol={legacySignClient.protocol}
        />

        <Divider y={2} />

        <RequestDataCard data={data} />

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
