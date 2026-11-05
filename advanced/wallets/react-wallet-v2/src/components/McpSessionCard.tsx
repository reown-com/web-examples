import { Avatar, Button, Card, Row, Text } from '@nextui-org/react'
import Image from 'next/image'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import { useMemo } from 'react'
import StyledDivider from '@/components/StyledDivider'
import { GRAY_RGB, McpChainChip, McpPill } from '@/components/McpUi'
import { styledToast, truncate } from '@/utils/HelperUtil'
import { McpServerInfo, McpSession } from '@/utils/McpApiUtil'
import { MCP_ORIGIN } from '@/utils/McpAuthUtil'
import { walletkit } from '@/utils/WalletConnectUtil'

/**
 * Types
 */
interface Props {
  session: McpSession
  serverInfo: McpServerInfo
  busy: boolean
  onDisconnect: () => void
}

/**
 * Component
 */
export default function McpSessionCard({ session, serverInfo, busy, onDisconnect }: Props) {
  const peer = useMemo(() => {
    try {
      return walletkit?.getActiveSessions?.()[session.topic]?.peer.metadata
    } catch {
      return undefined
    }
  }, [session.topic])

  const addresses = useMemo(
    () =>
      Array.from(new Set(session.accounts.map(account => account.split(':')[2]).filter(Boolean))),
    [session.accounts]
  )
  const chains = useMemo(() => Array.from(new Set(session.chains)), [session.chains])
  const host = (peer?.url ?? MCP_ORIGIN).replace(/^https?:\/\//, '')

  function copy(address: string) {
    navigator.clipboard?.writeText(address)
    styledToast('Address copied', 'success')
  }

  return (
    <Card
      bordered
      borderWeight="light"
      css={{
        marginBottom: '$8',
        background:
          'linear-gradient(135deg, rgba(0, 114, 245, 0.16) 0%, rgba(123, 31, 162, 0.12) 100%)'
      }}
      data-testid="mcp-session-card"
    >
      <Card.Body css={{ padding: '$8' }}>
        <Row align="center" css={{ gap: '$6' }}>
          <Avatar
            size="lg"
            color="gradient"
            icon={<Image alt="" src="/wallet-connect-logo.svg" width={30} height={30} />}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text h5 css={{ margin: 0 }}>
              {peer?.name ?? serverInfo.name}
            </Text>
            <Text size={12} color="$gray600" css={{ margin: 0 }}>
              {host} · v{serverInfo.version}
            </Text>
          </div>
        </Row>

        <StyledDivider css={{ my: '$6' }} />

        <Row wrap="wrap" css={{ gap: '$3', marginBottom: '$6' }}>
          {chains.map(chain => (
            <McpChainChip key={chain} chain={chain} />
          ))}
        </Row>

        <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
          {addresses.length > 1 ? 'Accounts' : 'Account'}
        </Text>
        {addresses.map(address => (
          <Row key={address} align="center" justify="space-between" css={{ marginBottom: '$2' }}>
            <Text
              size={13}
              css={{ fontFamily: '$mono', margin: 0 }}
              data-testid="mcp-session-account"
            >
              {truncate(address, 22)}
            </Text>
            <Button
              light
              auto
              size="xs"
              css={{ minWidth: 0, padding: '0 $2', color: '$gray600' }}
              icon={<ContentCopyIcon style={{ fontSize: 16 }} />}
              onClick={() => copy(address)}
              aria-label="copy address"
            />
          </Row>
        ))}

        <Text size={12} color="$gray600" css={{ marginTop: '$6', marginBottom: '$2' }}>
          Limits per transaction
        </Text>
        <Row css={{ gap: '$3', flexWrap: 'wrap' }}>
          {Object.entries(serverInfo.caps).map(([symbol, cap]) => (
            <McpPill key={symbol} rgb={GRAY_RGB}>
              ≤ {cap} {symbol.toUpperCase()}
            </McpPill>
          ))}
        </Row>

        <StyledDivider css={{ my: '$6' }} />

        <Row justify="space-between" align="center">
          <Text size={12} color="$gray600" css={{ margin: 0 }}>
            Session expires {new Date(session.expiry * 1000).toLocaleDateString()}
          </Text>
          <Button
            flat
            auto
            size="xs"
            color="error"
            disabled={busy}
            icon={<LinkOffIcon style={{ fontSize: 16 }} />}
            onClick={onDisconnect}
            data-testid="mcp-disconnect"
          >
            Disconnect
          </Button>
        </Row>
      </Card.Body>
    </Card>
  )
}
