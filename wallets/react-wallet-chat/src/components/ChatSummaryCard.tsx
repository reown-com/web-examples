import { demoAddressResolver } from '@/config/chatConstants'
import { truncate } from '@/utils/HelperUtil'
import { Card, Text } from '@nextui-org/react'
import Image from 'next/image'
import NextLink from 'next/link'
import ChatAvatar from './ChatAvatar'

/**
 * Types
 */
interface IProps {
  topic?: string
  peerAccount: string
  latestMessage?: string
}

/**
 * Component
 */
export default function ChatSummaryCard({ peerAccount, topic, latestMessage }: IProps) {
  return (
    <NextLink href={`/chat?topic=${topic}&peerAccount=${peerAccount}`} passHref>
      <Card
        clickable
        bordered
        borderWeight="light"
        css={{
          position: 'relative',
          marginBottom: '$6',
          minHeight: '70px'
        }}
      >
        <Card.Body
          css={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          <ChatAvatar />
          <div style={{ flex: 1 }}>
            <Text h5 css={{ marginLeft: '$9' }}>
              {demoAddressResolver[peerAccount] ?? truncate(peerAccount, 24)}
            </Text>
            <Text h6 weight="normal" css={{ marginLeft: '$9' }}>
              {latestMessage ?? ''}
            </Text>
          </div>

          <Image src={'/icons/arrow-right-icon.svg'} width={20} height={20} alt="session icon" />
        </Card.Body>
      </Card>
    </NextLink>
  )
}
