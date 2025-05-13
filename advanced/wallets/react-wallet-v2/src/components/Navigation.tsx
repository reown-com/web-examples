import { Avatar, Row } from '@nextui-org/react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navigation() {
  return (
    <Row justify="space-between" align="center">
      <Link href="/" passHref className="navLink" data-testid="accounts">
        <Image alt="accounts icon" src="/icons/accounts-icon.svg" width={27} height={27} />
      </Link>

      <Link href="/sessions" passHref className="navLink" data-testid="sessions">
        <Image alt="sessions icon" src="/icons/sessions-icon.svg" width={27} height={27} />
      </Link>

      <Link href="/walletconnect" passHref className="navLink" data-testid="wc-connect">
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

      <Link href="/pairings" passHref className="navLink" data-testid="pairings">
        <Image alt="pairings icon" src="/icons/pairings-icon.svg" width={25} height={25} />
      </Link>

      <Link href="/settings" passHref className="navLink" data-testid="settings">
        <Image alt="settings icon" src="/icons/settings-icon.svg" width={27} height={27} />
      </Link>
    </Row>
  )
}
