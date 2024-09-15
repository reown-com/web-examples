import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Col, Divider, Row, Text, Code, Checkbox, Grid } from '@nextui-org/react'
import { buildAuthObject, getSdkError, populateAuthPayload } from '@walletconnect/utils'

import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from '../components/RequestModal'
import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { styledToast } from '@/utils/HelperUtil'

export default function SessionAuthenticateModal() {
  // Get request and wallet data from store
  const authRequest = ModalStore.state.data?.authRequest

  const { account } = useSnapshot(SettingsStore.state)
  const [messages, setMessages] = useState<
    { authPayload: any; message: string; id: number; iss: string }[]
  >([])
  const [supportedChains] = useState<string[]>(Object.keys(EIP155_CHAINS))
  const [supportedMethods] = useState<string[]>(Object.values(EIP155_SIGNING_METHODS))
  const [signStrategy, setSignStrategy] = useState(1)
  // Ensure request and wallet are defined

  const address = eip155Addresses[account]

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const getMessageToSign = useCallback(
    (authPayload, iss) => {
      const message = web3wallet.engine.signClient.formatAuthMessage({
        request: authPayload,
        iss
      })
      console.log('message', message)
      return message
    },
    [address]
  )

  useEffect(() => {
    if (!authRequest?.params?.authPayload) return
    console.log('authRequest', authRequest)
    console.log('supportedChains', supportedChains)
    const newAuthPayload = populateAuthPayload({
      authPayload: authRequest?.params?.authPayload,
      chains: supportedChains,
      methods: supportedMethods
    })

    if (signStrategy === 1) {
      try {
        console.log('newAuthPayload', newAuthPayload)
        const iss = `${newAuthPayload.chains[0]}:${address}`
        const message = getMessageToSign(newAuthPayload, iss)
        setMessages([
          {
            authPayload: newAuthPayload,
            message,
            id: authRequest.id,
            iss
          }
        ])
      } catch (e) {
        console.log('error', e)
        styledToast((e as Error).message, 'error')
        ModalStore.close()
      }
    } else if (signStrategy === 2) {
      const messagesToSign: any[] = []
      newAuthPayload.chains.forEach((chain: string) => {
        const iss = `${chain}:${address}`
        const message = web3wallet.engine.signClient.formatAuthMessage({
          request: newAuthPayload,
          iss
        })
        messagesToSign.push({
          authPayload: newAuthPayload,
          message,
          iss,
          id: authRequest.id
        })
      })
      setMessages(messagesToSign)
    }
  }, [address, authRequest, getMessageToSign, signStrategy, supportedChains, supportedMethods])

  // Handle approve action (logic varies based on request method)
  const onApprove = useCallback(async () => {
    if (messages.length) {
      const signedAuths = []
      for (const message of messages) {
        const signature = await eip155Wallets[address].signMessage(message.message)
        const signedCacao = buildAuthObject(
          message.authPayload,
          {
            t: 'eip191',
            s: signature
          },
          message.iss
        )
        signedAuths.push(signedCacao)
      }

      await web3wallet.engine.signClient.approveSessionAuthenticate({
        id: messages[0].id,
        auths: signedAuths
      })
      SettingsStore.setSessions(Object.values(web3wallet.getActiveSessions()))
      ModalStore.close()
    }
  }, [address, messages])

  // Handle reject action
  const onReject = useCallback(async () => {
    if (authRequest?.params?.authPayload) {
      await web3wallet.engine.signClient.rejectSessionAuthenticate({
        id: authRequest.id,
        reason: getSdkError('USER_REJECTED')
      })
      ModalStore.close()
    }
  }, [authRequest])

  return (
    <RequestModal
      intention="request a signature"
      metadata={authRequest?.params?.requester.metadata!}
      onApprove={onApprove}
      onReject={onReject}
    >
      <Grid.Container>
        <Grid>
          <Checkbox onChange={() => setSignStrategy(1)} checked={signStrategy === 1}>
            Sign One
          </Checkbox>
        </Grid>
        <Grid style={{ marginLeft: '10px' }}>
          <Checkbox onChange={() => setSignStrategy(2)} checked={signStrategy === 2}>
            Sign All
          </Checkbox>
        </Grid>
      </Grid.Container>
      <Row>
        <Col>
          <Text h5>Messages to Sign ({messages.length})</Text>
          {messages.map((message, index) => {
            console.log('@loop messageToSign', message)
            return (
              <Code key={index}>
                <Text color="$gray400">{message.message}</Text>
              </Code>
            )
          })}
        </Col>
      </Row>
    </RequestModal>
  )
}
