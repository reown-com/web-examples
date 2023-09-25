import PageHeader from '@/components/PageHeader'
import { Text } from '@nextui-org/react'
import { Fragment, useEffect, useState } from 'react'
import { chatClient } from '@/utils/WalletConnectUtil'
import { ChatClientTypes } from '@walletconnect/chat-client'
import ChatRequestCard from '@/components/ChatRequestCard'
import { useRouter } from 'next/router'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'

export default function ChatRequestsPage() {
  const router = useRouter()
  const [chatInvites, setChatInvites] = useState<ChatClientTypes.ReceivedInvite[]>([])

  const { eip155Address } = useSnapshot(SettingsStore.state)

  useEffect(() => {
    console.log(
      'setting invites:',
      chatClient.getReceivedInvites({ account: `eip155:1:${eip155Address}` })
    )

    setChatInvites(chatClient.getReceivedInvites({ account: `eip155:1:${eip155Address}` }))
  }, [])

  console.log('NEWINVITES:::::', chatInvites)

  const acceptChatInvite = async (inviteId: number) => {
    await chatClient.accept({ id: inviteId })
    router.push('/chats')
  }
  const rejectChatInvite = async (inviteId: number) => {
    await chatClient.reject({ id: inviteId })
    router.push('/chats')
  }

  return (
    <Fragment>
      <PageHeader title="Chat Requests" withBackButton backButtonHref="/chats" />

      {chatInvites.length > 0 ? (
        chatInvites.map(invite => {
          return (
            <ChatRequestCard
              account={eip155Address}
              key={invite.id}
              {...invite}
              onAccept={() => acceptChatInvite(Number(invite.id))}
              onReject={() => rejectChatInvite(Number(invite.id))}
            />
          )
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          No chat requests
        </Text>
      )}
    </Fragment>
  )
}
