import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { FiArrowRight } from 'react-icons/fi'
import { HiQrcode } from 'react-icons/hi'
import { Input, Row } from '@nextui-org/react'
import { Web3Modal } from '@web3modal/standalone'
import PageHeader from '@/components/PageHeader'
import { chatClient } from '@/utils/WalletConnectUtil'
import { ChatClientTypes } from '@walletconnect/chat-client'
import ChatPrimaryCTAButton from '@/components/ChatPrimaryCTAButton'
import { demoContactsMap } from '@/config/chatConstants'
import SettingsStore from '@/store/SettingsStore'

const web3modal = new Web3Modal({})

export default function NewChatPage() {
  const [address, setAddress] = useState('')

  const { eip155Address } = useSnapshot(SettingsStore.state)

  const createInvite = useCallback(
    async (targetAddress: string) => {
      const invite: ChatClientTypes.PartialInvite = {
        message: "hey let's chat",
        account: `eip155:1:${eip155Address}`
      }
      await chatClient.invite({
        account: targetAddress,
        invite
      })
    },
    [eip155Address]
  )

  const onInvite = useCallback(
    async (addressToInvite: string) => {
      if (demoContactsMap[addressToInvite]) {
        await createInvite(demoContactsMap[addressToInvite])
      } else {
        console.log('onInvite: inviting address ', addressToInvite)
        await createInvite(addressToInvite)
      }
      setAddress('')
    },
    [setAddress, createInvite]
  )

  const inviteQrCode = useCallback(async () => {
    const uri = `${window.location.origin}/newChat?accountId=1&target=eip155:1:${SettingsStore.state.eip155Address}`
    web3modal.openModal({ uri })
  }, [])

  useEffect(() => {
    const newChatTarget = new URLSearchParams(document.location.search).get('target')
    if (newChatTarget) {
      setAddress(newChatTarget)
      onInvite(newChatTarget)
    }
  }, [onInvite, setAddress])

  return (
    <Fragment>
      <PageHeader
        title="New Chat"
        withBackButton
        backButtonHref="/chats"
        ctaButton={
          <Row justify="space-evenly">
            <ChatPrimaryCTAButton icon={<HiQrcode />} onClick={inviteQrCode} />
            <ChatPrimaryCTAButton icon={<FiArrowRight />} onClick={() => onInvite(address)} />
          </Row>
        }
      />

      <Row justify="center">
        <Input
          fullWidth
          animated={false}
          label="ENS Name or Address"
          placeholder="username.eth or 0x0..."
          value={address}
          onChange={e => {
            setAddress(e.target.value)
          }}
          css={{
            padding: '$5',
            background: '$gray800'
          }}
        />
      </Row>
    </Fragment>
  )
}
