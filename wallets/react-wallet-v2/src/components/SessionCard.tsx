import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Card, Link, Text } from '@nextui-org/react'

/**
 * Types
 */
interface IProps {
  logo?: string
  name?: string
  url?: string
  onDelete: () => Promise<void>
}

/**
 * Component
 */
export default function SessionCard({ logo, name, url, onDelete }: IProps) {
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
            {name}
          </Text>
          <Link href={url} css={{ marginLeft: '$9' }}>
            {truncate(url?.split('https://')[1] ?? 'Unknown', 23)}
          </Link>
        </div>
        <Button size="xs" color="error" flat onClick={onDelete}>
          DELETE
        </Button>
      </Card.Body>
    </Card>
  )
}
