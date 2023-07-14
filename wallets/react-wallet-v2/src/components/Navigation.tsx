import { Avatar, Row } from '@nextui-org/react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navigation() {
  return (
    <Row justify="space-between" align="center">
      <Link href="/" passHref data-testid="accounts">
        <a className="navLink">
          <Image alt="accounts icon" src="/icons/accounts-icon.svg" width={27} height={27} />
        </a>
      </Link>

      <Link href="/sessions" passHref data-testid="sessions">
        <a className="navLink">
          <Image alt="sessions icon" src="/icons/sessions-icon.svg" width={27} height={27} />
        </a>
      </Link>

      <Link href="/walletconnect" passHref data-testid="wc-connect">
        <a className="navLink">
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

      <Link href="/pairings" passHref data-testid="pairings">
        <a className="navLink">
          <Image alt="pairings icon" src="/icons/pairings-icon.svg" width={25} height={25} />
        </a>
      </Link>

      <Link href="/settings" passHref data-testid="settings">
        <a className="navLink">
          <Image alt="settings icon" src="/icons/settings-icon.svg" width={27} height={27} />
        </a>
      </Link>
    </Row>
  )
}
