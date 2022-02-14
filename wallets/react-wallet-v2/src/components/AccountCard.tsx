import { truncate } from '@/utils/HelperUtil'
import { Avatar, Card, Text } from '@nextui-org/react'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
}

export default function AccountCard({ name, logo, rgb, address }: Props) {
  return (
    <Card
      bordered
      clickable
      borderWeight="light"
      css={{
        borderColor: `rgba(${rgb}, 0.4)`,
        boxShadow: `0 0 10px 0 rgba(${rgb}, 0.15)`,
        backgroundColor: `rgba(${rgb}, 0.25)`,
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
          <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
            {truncate(address, 19)}
          </Text>
        </div>
      </Card.Body>
    </Card>
  )
}
