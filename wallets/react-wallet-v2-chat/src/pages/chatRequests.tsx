import PageHeader from '@/components/PageHeader'
import { Text } from '@nextui-org/react'
import { Fragment, useEffect, useState } from 'react'
import { chatClient } from '@/utils/WalletConnectUtil'
import { ChatClientTypes } from '@walletconnect/chat-client'
import ChatRequestCard from '@/components/ChatRequestCard'
import { useRouter } from 'next/router'

export default function ChatRequestsPage() {
  const router = useRouter()
  const [chatInvites, setChatInvites] = useState<Map<number, ChatClientTypes.Invite>>(new Map())

  useEffect(() => {
    console.log('setting invites:', chatClient.getInvites())

    setChatInvites(chatClient.getInvites())
  }, [])

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

      {chatInvites.size > 0 ? (
        Array.from(chatInvites).map(([inviteId, invite]) => {
          return (
            <ChatRequestCard
              key={inviteId}
              {...invite}
              onAccept={() => acceptChatInvite(Number(inviteId))}
              onReject={() => rejectChatInvite(Number(inviteId))}
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
