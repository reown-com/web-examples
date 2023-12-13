import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Card, Link, Text, Tooltip } from '@nextui-org/react'
import Image from 'next/image'

/**
 * Types
 */
interface IProps {
  logo?: string
  title?: string
  body?: string
  url?: string
  publishedAt?: number
  onDelete: () => Promise<void>
}

/**
 * Component
 */
export default function NotificationItem({
  logo,
  title,
  body,
  url,
  publishedAt,
  onDelete
}: IProps) {
  return (
    <Card
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
            {title}
          </Text>
          {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
          </div> */}
          <Text h6 css={{ marginLeft: '$9' }}>
            {body}
          </Text>
          {publishedAt && (
            <Text span css={{ marginLeft: '$9', fontSize: '12px' }}>
              {new Date(publishedAt).toLocaleDateString()} -{' '}
              {new Date(publishedAt).toLocaleTimeString()}
            </Text>
          )}
          <Link href={url} css={{ marginLeft: '$9' }} target="_blank" rel="noopener noreferrer">
            {url}
          </Link>
        </div>
        <Tooltip content="Delete" placement="left">
          <Button size="sm" color="error" flat onClick={onDelete} css={{ minWidth: 'auto' }}>
            <Image src={'/icons/delete-icon.svg'} width={15} height={15} alt="delete icon" />
          </Button>
        </Tooltip>
      </Card.Body>
    </Card>
  )
}
