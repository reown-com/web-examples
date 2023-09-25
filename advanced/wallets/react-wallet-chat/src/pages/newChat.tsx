import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { FiArrowRight } from 'react-icons/fi'
import { Input, Row } from '@nextui-org/react'
import PageHeader from '@/components/PageHeader'
import { chatClient } from '@/utils/WalletConnectUtil'
import { ChatClientTypes } from '@walletconnect/chat-client'
import ChatPrimaryCTAButton from '@/components/ChatPrimaryCTAButton'
import { demoContactsMap } from '@/config/chatConstants'
import SettingsStore from '@/store/SettingsStore'
import { useRouter } from 'next/router'

export default function NewChatPage() {
  const [address, setAddress] = useState('')
  const router = useRouter()

  const { eip155Address } = useSnapshot(SettingsStore.state)

  useEffect(() => {
    chatClient.once('chat_invite_accepted', args => {
      const newChatTarget = new URLSearchParams(document.location.search).get('target')
      router.push(`/chat?topic=${args.topic}&peerAccount=${newChatTarget}`)
    })
  }, [router])

  const createInvite = useCallback(
    async (targetAddress: string) => {
      await chatClient.invite({
        inviteeAccount: targetAddress,
        inviterAccount: `eip155:1:${eip155Address}`,
        message: "hey let's message",
        inviteePublicKey: await chatClient.resolve({ account: targetAddress })
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
          <ChatPrimaryCTAButton icon={<FiArrowRight />} onClick={() => onInvite(address)} />
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
