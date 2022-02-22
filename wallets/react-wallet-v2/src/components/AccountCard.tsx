import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Card, Text, Tooltip } from '@nextui-org/react'
import Image from 'next/image'
import { useState } from 'react'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
}

export default function AccountCard({ name, logo, rgb, address }: Props) {
  const [copied, setCopied] = useState(false)

  function onCopy() {
    navigator?.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <Card
      bordered
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

        <Tooltip content="Copy" color="invert" placement="left">
          <Button
            size="sm"
            css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            onClick={onCopy}
          >
            <Image
              src={copied ? '/icons/checkmark-icon.svg' : '/icons/copy-icon.svg'}
              width={15}
              height={15}
              alt="copy icon"
            />
          </Button>
        </Tooltip>
      </Card.Body>
    </Card>
  )
}
