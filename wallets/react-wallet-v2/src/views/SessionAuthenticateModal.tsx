import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Col, Divider, Row, Text, Code } from '@nextui-org/react'
import { buildAuthObject, getSdkError } from '@walletconnect/utils'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'

export default function SessionAuthenticateModal() {
  const { account } = useSnapshot(SettingsStore.state)
  const [messages, setMessages] = useState<string[]>([])
  console.log('modal data', ModalStore.state.data, account)
  // Get request and wallet data from store
  const authRequest = ModalStore.state.data?.authRequest
  // Ensure request and wallet are defined

  if (!authRequest) {
    return <Text>Missing authRequest data</Text>
  }

  const address = eip155Addresses[account]

  // Get required request data
  const { id, params } = authRequest
  const { requester, authPayload } = params

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMemo(() => {
    if (authRequest && !messages.length) {
      const messagesToSign: string[] = []
      authPayload.chains.forEach(async chainId => {
        const iss = `${chainId}:${address}`
        const message = web3wallet.engine.signClient.formatAuthMessage({
          request: authPayload,
          iss
        })
        console.log('message', message)
        messagesToSign.push(message)
      })
      setMessages(messagesToSign)
    }
  }, [address, authPayload, authRequest, messages])

  // Handle approve action (logic varies based on request method)
  async function onApprove() {
    if (authPayload && messages.length) {
      const signedAuths: any[] = []
      authPayload.chains.forEach(async chainId => {
        const iss = `${chainId}:${address}`
        const message = web3wallet.engine.signClient.formatAuthMessage({
          request: authPayload,
          iss
        })

        const signature = await eip155Wallets[address].signMessage(message)
        const signedCacao = buildAuthObject(
          authPayload,
          {
            t: 'eip191',
            s: signature
          },
          iss
        )
        console.log('signedCacao', signedCacao)
        signedAuths.push(signedCacao)
      })

      await web3wallet.engine.signClient.approveSessionAuthenticate({
        id,
        auths: signedAuths
      })

      ModalStore.close()
    }
  }

  // Handle reject action
  async function onReject() {
    if (authPayload) {
      await web3wallet.engine.signClient.rejectSessionAuthenticate({
        id,
        reason: getSdkError('USER_REJECTED')
      })
      ModalStore.close()
    }
  }
  return (
    <RequestModal
      intention="request a signature"
      metadata={requester.metadata}
      onApprove={onApprove}
      onReject={onReject}
    >
      <Row>
        <Col>
          <Text h5>Messages to Sign ({messages.length})</Text>
          {messages.map((message, index) => {
            return (
              <Code key={index}>
                <Text color="$gray400">{message}</Text>
              </Code>
            )
          })}
        </Col>
      </Row>
    </RequestModal>
  )
}
