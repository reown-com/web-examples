import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Card, Link, Text, Tooltip } from '@nextui-org/react'
import Image from 'next/image'

/**
 * Types
 */
interface IProps {
  logo?: string
  name?: string
  url?: string
  topic?: string
  onDelete: () => Promise<void>
}

/**
 * Component
 */
export default function PairingCard({ logo, name, url, topic, onDelete }: IProps) {
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
          <Text h5 css={{ marginLeft: '$9' }} data-testid={'pairing-text-' + topic}>
            {name}
          </Text>
          <Link href={url} css={{ marginLeft: '$9' }}>
            <a data-testid={'pairing-text-' + topic}>
              {truncate(url?.split('https://')[1] ?? 'Unknown', 23)}
            </a>            
          </Link>
        </div>
        <Tooltip content="Delete" placement="left">
          <Button size="sm" color="error" flat onClick={onDelete} css={{ minWidth: 'auto' }} data-testid={'pairing-delete-' + topic}>
            <Image src={'/icons/delete-icon.svg'} width={15} height={15} alt="delete icon" />
          </Button>
        </Tooltip>
      </Card.Body>
    </Card>
  )
}
