import { Avatar, Row } from '@nextui-org/react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navigation() {
  return (
    <Row justify="space-between" align="center" css={{ width: '80%', margin: '0 auto' }}>
      <Link href="/" passHref>
        <a>
          <Image alt="accounts icon" src="/accounts-icon.svg" width={30} height={30} />
        </a>
      </Link>

      <Link href="/walletconnect" passHref>
        <a>
          <Avatar
            size="lg"
            css={{ cursor: 'pointer' }}
            color="gradient"
            icon={
              <Image
                alt="wallet connect icon"
                src="/wallet-connect-logo.svg"
                width={30}
                height={30}
              />
            }
          />
        </a>
      </Link>

      <Link href="/settings" passHref>
        <a>
          <Image alt="settings icon" src="/settings-icon.svg" width={35} height={35} />
        </a>
      </Link>
    </Row>
  )
}
