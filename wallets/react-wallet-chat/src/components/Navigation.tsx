import { Avatar, Row, styled } from '@nextui-org/react'
import { FiMessageCircle } from 'react-icons/fi'
import Image from 'next/image'
import Link from 'next/link'

const StyledChatIcon = styled(FiMessageCircle, {
  color: '$primary'
} as any)

export default function Navigation() {
  return (
    <Row justify="space-between" align="center">
      <Link href="/" passHref>
        <a className="navLink">
          <Image alt="accounts icon" src="/icons/accounts-icon.svg" width={27} height={27} />
        </a>
      </Link>

      <Link href="/sessions" passHref>
        <a className="navLink">
          <Image alt="sessions icon" src="/icons/sessions-icon.svg" width={27} height={27} />
        </a>
      </Link>

      <Link href="/walletconnect" passHref>
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

      {/* TODO: re-enable pairings link */}
      {/* <Link href="/pairings" passHref>
        <a className="navLink">
          <Image alt="pairings icon" src="/icons/pairings-icon.svg" width={25} height={25} />
        </a>
      </Link> */}

      <Link href="/chats" passHref>
        <a className="navLink">
          <Image alt="chats icon" src="/icons/chat-icon.svg" width={25} height={25} />
        </a>
      </Link>

      <Link href="/settings" passHref>
        <a className="navLink">
          <Image alt="settings icon" src="/icons/settings-icon.svg" width={27} height={27} />
        </a>
      </Link>
    </Row>
  )
}
