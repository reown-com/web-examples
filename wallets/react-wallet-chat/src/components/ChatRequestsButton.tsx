import { Avatar, Button } from '@nextui-org/react'
import NextLink from 'next/link'

interface IProps {
  requestCount: number
}

export default function ChatRequestsButton({ requestCount }: IProps) {
  return (
    <NextLink href={`/chatRequests`} passHref>
      <Button
        rounded
        css={{
          width: '100%',
          color: '$chatGreenPrimary',
          background: '$chatGreenSecondary',
          fontWeight: '$bold'
        }}
      >
        <Avatar
          text={requestCount.toString()}
          size="sm"
          css={{
            marginRight: '$5',
            '> span': {
              fontSize: '$md !important',
              color: 'black !important',
              background: '$chatGreenPrimary !important'
            }
          }}
        />
        Chat Requests
      </Button>
    </NextLink>
  )
}
