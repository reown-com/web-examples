import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Col, Divider, Row, Text, Code, Checkbox, Grid } from '@nextui-org/react'
import { buildAuthObject, getSdkError, populateAuthPayload } from '@walletconnect/utils'
import { decodeRecap } from '@walletconnect/utils'
import ModalFooter from '@/components/ModalFooter'
import ProjectInfoCard from '@/components/ProjectInfoCard'
import RequestModalContainer from '@/components/RequestModalContainer'
import VerifyInfobox from '@/components/VerifyInfobox'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses, eip155Wallets, getWallet } from '@/utils/EIP155WalletUtil'
import { web3wallet } from '@/utils/WalletConnectUtil'
import RequestModal from './RequestModal'
import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import { styledToast } from '@/utils/HelperUtil'
import usePriorityAccounts from '@/hooks/usePriorityAccounts'
import { smartAccountWallets } from '@/utils/SmartAccountUtil'
import { SafeSmartAccountLib } from '@/lib/smart-accounts/SafeSmartAccountLib'

export default function SessionAuthenticateModal() {
  // Get request and wallet data from store
  const authRequest = ModalStore.state.data?.authRequest

  const {
    account,
    smartAccountEnabled,
    safeSmartAccountEnabled,
    safeSmartAccountAddress,
    kernelSmartAccountAddress,
    kernelSmartAccountEnabled,
    biconomySmartAccountAddress,
    biconomySmartAccountEnabled
  } = useSnapshot(SettingsStore.state)
  const [messages, setMessages] = useState<
    { authPayload: any; message: string; id: number; iss: string }[]
  >([])
  const [supportedChains] = useState<string[]>(Object.keys(EIP155_CHAINS))
  const [supportedMethods] = useState<string[]>(Object.values(EIP155_SIGNING_METHODS))
  const [signStrategy, setSignStrategy] = useState(1)

  const priorityAccounts = usePriorityAccounts({})
  console.log({ authPayload: authRequest?.params.authPayload })
  console.log({ priorityAccounts })
  // Ensure request and wallet are defined
  const address = smartAccountEnabled
    ? safeSmartAccountEnabled
      ? safeSmartAccountAddress
      : kernelSmartAccountEnabled
      ? kernelSmartAccountAddress
      : biconomySmartAccountEnabled
      ? biconomySmartAccountAddress
      : eip155Addresses[account]
    : eip155Addresses[account]

  function extractAndParsePermissionsParameters(inputString: string) {
    // Remove the prefix
    const jsonString = inputString.replace('submit transactions with permissons/', '')

    try {
      // Parse the remaining string as JSON
      const jsonObject = JSON.parse(jsonString)
      return jsonObject
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return null
    }
  }

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

  function getSmartWallet(accountAddress: string, chainId: string) {
    const smartAccount = `${chainId}:${accountAddress}`
    const account = Object.keys(smartAccountWallets).find(sca => {
      return sca.toLowerCase() === smartAccount.toLowerCase()
    })
    if (account) {
      const lib = smartAccountWallets[account]
      if (lib) {
        return lib
      }
    }
  }

  const extractURI = (message: string) => {
    const uriRegex = /URI:\s*(https?:\/\/[^\s]+)/
    const match = message.match(uriRegex)
    return match ? match[1] : null
  }

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

  const onApprove = useCallback(async () => {
    if (messages.length) {
      const signedAuths = []
      for (const message of messages) {
        let signature = '0x'
        if (smartAccountEnabled) {
          let grantedPermissions = undefined
          const chainId = message.iss.split(':')[1]
          const accountAddress = message.iss.split(':')[2]
          const scw = getSmartWallet(accountAddress, chainId)
          if(!scw) return
            signature = await scw.signMessage(message.message)
            console.log({signature})
          if (scw && scw instanceof SafeSmartAccountLib) {
            const msg = message.message
            const uri = extractURI(msg);
            console.log("Extracted URI:", uri);
            if(uri) {
              const recapIndex = msg.lastIndexOf('recap:')
              const recapString = msg.substring(recapIndex+6)
              const recapType = decodeRecap(recapString)
              const recap = recapType['att'][uri]
              console.log(Object.keys(recap)[0])
              const permissionsParameter = extractAndParsePermissionsParameters(Object.keys(recap)[0] as unknown as string)
              console.log(permissionsParameter)
              if(permissionsParameter){
                grantedPermissions = await scw.grantPermissions(permissionsParameter)
                console.log(grantedPermissions)
              }
            }
            
          }
          const signedCacao = buildAuthObject(
            message.authPayload,
            {
              t: 'eip1271',
              s: signature
            },
            message.iss
          )
          grantedPermissions && signedCacao.p.resources?.push(JSON.stringify(grantedPermissions))
          signedAuths.push(signedCacao)
        } else {
          signature = await eip155Wallets[address].signMessage(message.message)
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
      }
      console.log({signedAuths})
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
