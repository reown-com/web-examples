import { Avatar, Row } from '@nextui-org/react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navigation() {
  return (
    <Row justify="space-between" align="center">
      <Row css={{ width: '50%' }} justify="space-between">
        <Link href="/" className="navLink">
          <Image alt="accounts icon" src="/icons/accounts-icon.svg" width={27} height={27} />
        </Link>

        <Link href="/sessions" className="navLink">
          <Image alt="sessions icon" src="/icons/sessions-icon.svg" width={27} height={27} />
        </Link>

        <Link href="/settings" className="navLink">
          <Image alt="settings icon" src="/icons/settings-icon.svg" width={27} height={27} />
        </Link>
      </Row>

      <Link href="/walletconnect" className="navLink">
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
      </Link>
    </Row>
  )
}
