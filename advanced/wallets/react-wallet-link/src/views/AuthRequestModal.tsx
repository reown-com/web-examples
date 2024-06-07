/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useState } from 'react'
import { Col, Row, Text, Code } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'

import ModalStore from '@/store/ModalStore'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'

export default function AuthRequestModal() {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const { address } = useWeb3ModalAccount()
  const { walletProvider } = useWeb3ModalProvider()
  // Get request and wallet data from store
  const request = ModalStore.state.data?.request
  // Ensure request and wallet are defined
  if (!request) {
    return <Text>Missing request data</Text>
  }

  const iss = `did:pkh:eip155:1:${address}`

  // Get required request data
  const { params } = request

  const message = web3wallet.formatMessage(params.cacaoPayload, iss)

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (request) {
      setIsLoadingApprove(true)
      const signature = await walletProvider?.request({
        method: 'personal_sign',
        params: [message, address]
      })
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
  }, [request, address, message, iss, walletProvider])

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
