import ChainCard from '@/components/ChainCard'
import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Text, Tooltip } from '@nextui-org/react'
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
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <ChainCard rgb={rgb} flexDirection="row" alignItems="center">
      <Avatar src={logo} />
      <div style={{ flex: 1 }}>
        <Text h5 css={{ marginLeft: '$9', marginBottom: 0 }}>
          {name}
        </Text>
        <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
          {truncate(address, 19)}
        </Text>
      </div>

      <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="left">
        <Button
          size="sm"
          css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          onPress={onCopy}
        >
          <Image
            src={copied ? '/icons/checkmark-icon.svg' : '/icons/copy-icon.svg'}
            width={15}
            height={15}
            alt="copy icon"
          />
        </Button>
      </Tooltip>
    </ChainCard>
  )
}
