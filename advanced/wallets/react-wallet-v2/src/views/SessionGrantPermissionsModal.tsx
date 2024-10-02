/* eslint-disable react-hooks/rules-of-hooks */
import { Divider, Text } from '@nextui-org/react'

import RequesDetailsCard from '@/components/RequestDetalilsCard'
import RequestMethodCard from '@/components/RequestMethodCard'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { useCallback, useState } from 'react'
import PermissionDetailsCard from '@/components/PermissionDetailsCard'
import {
  approveEIP7715Request,
  createErrorResponse,
  rejectEIP7715Request
} from '@/utils/EIP7715RequestHandlerUtils'
import { GrantPermissionsParameters } from 'viem/experimental'
// import { GrantPermissionsRequestParams } from '@/data/EIP7715Data'

export default function SessionGrantPermissionsModal() {
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  // Get required request data
  const { topic, params } = requestEvent
  const { request, chainId } = params
  let method = request.method

  // const isPermissionRequest = data?.domain?.name === 'eth_getPermissions_v1'
  let grantPermissionsRequestParams: GrantPermissionsParameters = request.params[0]
  console.log({ grantPermissionsRequestParams })
  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    try {
      if (requestEvent) {
        setIsLoadingApprove(true)
        const response = await approveEIP7715Request(requestEvent)
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      }
    } catch (e) {
      styledToast((e as Error).message, 'error')
      const response = createErrorResponse(requestEvent, (e as Error).message)
      await web3wallet.respondSessionRequest({
        topic,
        response
      })
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent) {
      setIsLoadingReject(true)
      const response = rejectEIP7715Request(requestEvent)
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response
        })
      } catch (e) {
        setIsLoadingReject(false)
        styledToast((e as Error).message, 'error')
        return
      }
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])
  return (
    <RequestModal
      intention="sign a message"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <RequesDetailsCard chains={[chainId ?? '']} protocol={requestSession.relay.protocol} />
      <Divider y={1} />
      {'Permissions'}
      <PermissionDetailsCard scope={[]} />
      <Divider y={1} />
      <RequestMethodCard methods={[method]} />
    </RequestModal>
  )
}
