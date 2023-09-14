import { Fragment, useEffect, useRef, useState } from 'react'
import { styled } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { useSnapshot } from 'valtio'

import ChatboxInput from '@/components/ChatboxInput'
import ChatMessage from '@/components/ChatMessage'
import PageHeader from '@/components/PageHeader'
import { demoAddressResolver } from '@/config/chatConstants'
import SettingsStore from '@/store/SettingsStore'
import { chatClient } from '@/utils/WalletConnectUtil'
import { truncate } from '@/utils/HelperUtil'

const ChatContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  height: '84%',
  maxWidth: '100%'
} as any)

const MessagesContainer = styled('div', {
  display: 'flex',
  flexGrow: 1,
  flexDirection: 'column',
  overflowY: 'scroll',
  padding: '10px'
} as any)

/**
 * Component
 */
export default function ChatPage() {
  const [topic, setTopic] = useState('')
  const [messages, setMessages] = useState<
    {
      message: string
      authorAccount: string
    }[]
  >([])
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const { query } = useRouter()
  const lastMessageRef = useRef<null | HTMLDivElement>(null)

  const fullEip155Address = `eip155:1:${eip155Address}`

  async function onOutgoingMessage(outgoingMessage: string) {
    await chatClient.message({
      topic,

      message: outgoingMessage,
      authorAccount: fullEip155Address,
      timestamp: Date.now()
    })

    if (chatClient.getMessages({ topic }).length) {
      setMessages(chatClient.getMessages({ topic }))
    }
  }

  function isOutgoingMessage(authorAccount: string) {
    return authorAccount === fullEip155Address
  }

  function getChatTitle() {
    if (typeof query.peerAccount !== 'string') return ''

    return demoAddressResolver[query.peerAccount] ?? truncate(query.peerAccount, 24)
  }

  useEffect(() => {
    if (query?.topic) {
      setTopic(query.topic as string)
    }
  }, [query])

  useEffect(() => {
    // Set existing messages on load.
    if (topic) {
      try {
        const messages = chatClient.getMessages({ topic })
        console.log('getMessages for topic: ', topic, messages)
        setMessages(messages)
      } catch (error) {}
    }
  }, [topic])

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (topic) {
      // Update local messages state on new message.
      chatClient.once('chat_message', eventArgs => {
        console.log('new chat message:', eventArgs)

        setMessages(chatClient.getMessages({ topic }))
      })
    }
  }, [messages, topic])

  return (
    <Fragment>
      <PageHeader title={getChatTitle()} backButtonHref="/chats" withBackButton />
      <ChatContainer>
        <MessagesContainer>
          {messages.map(({ message, authorAccount }, i) => (
            <ChatMessage
              key={i}
              message={message}
              messageType={isOutgoingMessage(authorAccount) ? 'outgoing' : 'incoming'}
            />
          ))}
          <div ref={lastMessageRef}></div>
        </MessagesContainer>
        <ChatboxInput handleSend={onOutgoingMessage} />
      </ChatContainer>
    </Fragment>
  )
}
