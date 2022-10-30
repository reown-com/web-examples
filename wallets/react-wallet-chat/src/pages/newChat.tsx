import { Fragment, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { FiArrowRight } from 'react-icons/fi'
import { Input, Row } from '@nextui-org/react'

import PageHeader from '@/components/PageHeader'
import { chatClient } from '@/utils/WalletConnectUtil'
import { ChatClientTypes } from '@walletconnect/chat-client'
import ChatPrimaryCTAButton from '@/components/ChatPrimaryCTAButton'
import { demoContactsMap } from '@/config/chatConstants'
import SettingsStore from '@/store/SettingsStore'

export default function NewChatPage() {
  const [address, setAddress] = useState('')
  const { eip155Address } = useSnapshot(SettingsStore.state)

  const createInvite = async (targetAddress: string) => {
    const invite: ChatClientTypes.PartialInvite = {
      message: "hey let's chat",
      account: `eip155:1:${eip155Address}`
    }
    const inviteId = await chatClient.invite({
      account: targetAddress,
      invite
    })
  }

  const onInvite = async () => {
    if (demoContactsMap[address]) {
      await createInvite(demoContactsMap[address])
    } else {
      console.log('onInvite: inviting address ', address)
      await createInvite(address)
    }
    setAddress('')
  }

  return (
    <Fragment>
      <PageHeader
        title="New Chat"
        withBackButton
        backButtonHref="/chats"
        ctaButton={<ChatPrimaryCTAButton icon={<FiArrowRight />} onClick={onInvite} />}
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
