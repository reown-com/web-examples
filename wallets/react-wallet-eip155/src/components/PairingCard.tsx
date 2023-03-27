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
  onDelete: () => Promise<void>
}

/**
 * Component
 */
export default function PairingCard({ logo, name, url, onDelete }: IProps) {
  return (
    <Card
      variant="bordered"
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
        <Tooltip content="Delete" placement="left">
          <Button size="sm" color="error" flat onPress={onDelete} css={{ minWidth: 'auto' }}>
            <Image src={'/icons/delete-icon.svg'} width={15} height={15} alt="delete icon" />
          </Button>
        </Tooltip>
      </Card.Body>
    </Card>
  )
}
