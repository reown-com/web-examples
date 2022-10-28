import { Avatar, Grid, styled, Text } from '@nextui-org/react'
import ChatAvatar from './ChatAvatar'

const Wrapper = styled('div', {
  display: 'flex',
  alignItems: 'flex-end',
  margin: '0.25rem 0',
  variants: {
    messageType: {
      incoming: {
        alignSelf: 'flex-start'
      },
      outgoing: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse'
      }
    }
  }
} as any)

const MessageContainer = styled('div', {
  position: 'relative',
  width: 'fit-content',
  padding: '0.25rem 0.75rem',
  textAlign: 'left',
  wordBreak: 'break-word',
  color: '$grey500',
  variants: {
    messageType: {
      incoming: {
        background: '$chatPurplePrimary',
        alignSelf: 'flex-start',
        borderRadius: '20px 20px 20px 6px'
      },
      outgoing: {
        background: '$gray800',
        alignSelf: 'flex-end',
        borderRadius: '20px 20px 6px 20px'
      }
    }
  }
} as any)

interface IProps {
  messageType: 'incoming' | 'outgoing'
  message: string
}

export default function ChatMessage({ messageType, message }: IProps) {
  return (
    /*  @ts-ignore */
    <Wrapper messageType={messageType}>
      {messageType === 'incoming' ? <ChatAvatar /> : null}

      <Grid.Container direction="column" css={{ margin: '0.5rem' }}>
        {/* {messageType === 'incoming' && (
          <Text size={12} color={'$secondary'}>
            username.eth
          </Text>
        )} */}
        {/*  @ts-ignore */}
        <MessageContainer messageType={messageType}>
          <Text color="$gray100">{message}</Text>
        </MessageContainer>
      </Grid.Container>
    </Wrapper>
  )
}
