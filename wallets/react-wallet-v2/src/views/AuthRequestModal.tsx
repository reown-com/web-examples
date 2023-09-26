import { Fragment } from 'react'
import { useSnapshot } from 'valtio'
import { Col, Divider, Row, Text, Code } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'

export default function AuthRequestModal() {
  const { account } = useSnapshot(SettingsStore.state)
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
  async function onApprove() {
    if (request) {
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
      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (request) {
      await web3wallet.respondAuthRequest(
        {
          id: request.id,
          error: getSdkError('USER_REJECTED')
        },
        iss
      )
      ModalStore.close()
    }
  }
  return (
    <RequestModal
      intention="request a signature"
      metadata={request.params.requester.metadata}
      onApprove={onApprove}
      onReject={onReject}
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
