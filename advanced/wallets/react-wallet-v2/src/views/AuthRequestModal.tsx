/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Col, Row, Text, Code } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'

import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'

export default function AuthRequestModal() {
  const { account } = useSnapshot(SettingsStore.state)
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  console.log('modal data', ModalStore.state.data, account)
  // Get request and wallet data from store
  const request = ModalStore.state.data?.request
  // Ensure request and wallet are defined
  if (!request) {
    return <Text>Missing request data</Text>
  }

  const address = eip155Addresses[account]
  const iss = `did:pkh:eip155:1:${address}`

  // Get required request data
  const { params } = request

  const message = web3wallet.formatMessage(params.cacaoPayload, iss)

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (request) {
      setIsLoadingApprove(true)
      const signature = await eip155Wallets[address].signMessage(message)
      await web3wallet.respondAuthRequest(
        {
          id: request.id,
          signature: {
            s: signature,
            t: 'eip191'
          }
        },
        iss
      )
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [request, address, message, iss])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (request) {
      setIsLoadingReject(true)
      await web3wallet.respondAuthRequest(
        {
          id: request.id,
          error: getSdkError('USER_REJECTED')
        },
        iss
      )
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [request, iss])

  return (
    <RequestModal
      intention="request a signature"
      metadata={request.params.requester.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={{ active: isLoadingReject }}
    >
      <Row>
        <Col>
          <Text h5>Message</Text>
          <Code>
            <Text color="$gray400">{message}</Text>
          </Code>
        </Col>
      </Row>
    </RequestModal>
  )
}
