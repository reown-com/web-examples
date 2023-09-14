import { truncate } from '@/utils/HelperUtil'
import { Avatar, Card, Link, Text } from '@nextui-org/react'
import Image from 'next/image'
import NextLink from 'next/link'

/**
 * Types
 */
interface IProps {
  topic?: string
  logo?: string
  name?: string
  url?: string
}

/**
 * Component
 */
export default function SessionCard({ logo, name, url, topic }: IProps) {
  return (
    <NextLink href={topic ? `/session?topic=${topic}` : '#'} passHref>
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
          <Avatar src={logo} />
          <div style={{ flex: 1 }}>
            <Text h5 css={{ marginLeft: '$9' }}>
              {name}
            </Text>
            <Link href={url} css={{ marginLeft: '$9' }}>
              {truncate(url?.split('https://')[1] ?? 'Unknown', 23)}
            </Link>
          </div>

          <Image src={'/icons/arrow-right-icon.svg'} width={20} height={20} alt="session icon" />
        </Card.Body>
      </Card>
    </NextLink>
  )
}
