import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Card, Text } from '@nextui-org/react'
import { Paper } from 'react-iconly'

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
      borderWeight="light"
      css={{
        borderColor: `rgba(${rgb}, 0.6)`,
        boxShadow: `0 0 10px 0 rgba(${rgb}, 0.1)`,
        marginBottom: '$6',
        overflowY: 'hidden',
        minHeight: '70px'
      }}
    >
      <Card.Body
        css={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Avatar src={logo} css={{ borderColor: `rgb(${rgb})` }} />
        <div style={{ flex: 1 }}>
          <Text h5 css={{ marginLeft: '$9' }}>
            {name}
          </Text>
          <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
            {truncate(address, 19)}
          </Text>
        </div>
        <Button auto flat color="primary" icon={<Paper filled />} />
      </Card.Body>
    </Card>
  )
}
