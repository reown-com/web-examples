import { Avatar, Button, Card, Loading, Row, Text } from '@nextui-org/react'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import McpActionCard from '@/components/McpActionCard'
import McpActionForms from '@/components/McpActionForms'
import McpPortfolioCard from '@/components/McpPortfolioCard'
import McpSessionCard from '@/components/McpSessionCard'
import {
  ERROR_RGB,
  GRAY_RGB,
  McpPill,
  McpSection,
  McpStatusPill,
  SUCCESS_RGB
} from '@/components/McpUi'
import PageHeader from '@/components/PageHeader'
import McpStore from '@/store/McpStore'
import ModalStore from '@/store/ModalStore'
import {
  isTerminalAction,
  McpAction,
  McpApi,
  McpPortfolio,
  McpServerInfo,
  McpSession
} from '@/utils/McpApiUtil'
import { isAuthorizationCallback, MCP_ORIGIN } from '@/utils/McpAuthUtil'

const FEATURES = [
  'Reads balances and your portfolio',
  'Prepares transfers and swaps on your behalf',
  'Every transaction is approved in this wallet'
]

/**
 * Page: this wallet as a client of the WalletConnect MCP HTTP API.
 * Also the OAuth redirect target (`/mcp?code=&state=`).
 */
export default function McpPage() {
  const router = useRouter()
  const state = useSnapshot(McpStore.state)
  const modal = useSnapshot(ModalStore.state)
  const handled = useRef(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!router.isReady || handled.current) return
    handled.current = true
    const params = new URLSearchParams(window.location.search)
    if (isAuthorizationCallback(params)) {
      router.replace('/mcp', undefined, { shallow: true })
      void McpStore.actions.completeCallback(params)
    } else {
      void McpStore.actions.initialize()
    }
  }, [router])

  async function onAuthorize() {
    setRedirecting(true)
    await McpStore.actions.authorize()
    setRedirecting(false)
  }

  const { actions } = McpStore
  const currentAction = state.currentAction as McpAction | null
  const actionInFlight = Boolean(currentAction && !isTerminalAction(currentAction.status))
  const otherOpenActions = state.openActions.filter(
    action => action.actionId !== currentAction?.actionId
  )
  const chains = state.serverInfo?.chains ?? []
  const requestModalOpen = modal.open
  const ready = state.phase === 'ready' && Boolean(state.session && state.serverInfo)
  /** The server's own relay socket; requests cannot reach this wallet while it is down */
  const relayUp = Boolean(state.walletStatus?.relayConnected)

  return (
    <Fragment>
      <PageHeader title="WalletConnect MCP">
        <Row align="center" justify="flex-end" css={{ gap: '$4' }}>
          {state.authorized ? (
            <McpPill
              rgb={
                ready
                  ? relayUp
                    ? SUCCESS_RGB
                    : ERROR_RGB
                  : state.phase === 'idle'
                  ? ERROR_RGB
                  : GRAY_RGB
              }
              dot
              data-testid="mcp-session-status"
            >
              {ready
                ? relayUp
                  ? 'Connected'
                  : 'Relay down'
                : state.phase === 'idle'
                ? 'Not paired'
                : 'Connecting'}
            </McpPill>
          ) : null}
          {ready ? (
            <Button
              light
              auto
              size="xs"
              css={{ minWidth: 0, padding: '0 $2', color: '$gray600' }}
              icon={<RefreshIcon style={{ fontSize: 20 }} />}
              onClick={() => actions.refresh()}
              aria-label="refresh"
              data-testid="mcp-refresh"
            />
          ) : null}
        </Row>
      </PageHeader>

      {state.error ? (
        <Card
          bordered
          borderWeight="light"
          css={{
            marginBottom: '$8',
            borderColor: `rgba(${ERROR_RGB}, 0.5)`,
            background: `rgba(${ERROR_RGB}, 0.08)`
          }}
        >
          <Card.Body css={{ padding: '$6' }}>
            <Row justify="space-between" align="center" css={{ gap: '$4' }}>
              <Text
                size={13}
                color="error"
                css={{ wordBreak: 'break-word', margin: 0 }}
                data-testid="mcp-error"
              >
                {state.error}
              </Text>
              <Button size="xs" light auto onClick={actions.dismissError} css={{ flexShrink: 0 }}>
                Dismiss
              </Button>
            </Row>
          </Card.Body>
        </Card>
      ) : null}

      {!state.authorized ? (
        <div style={{ textAlign: 'center', padding: '16px 4px 0' }}>
          <Avatar
            size="xl"
            color="gradient"
            css={{ margin: 'auto' }}
            icon={<Image src="/wallet-connect-logo.svg" width={36} height={36} alt="" />}
          />
          <Text h3 css={{ marginTop: '$8', marginBottom: '$2' }}>
            Connect to WalletConnect MCP
          </Text>
          <Text size={14} color="$gray600" css={{ marginBottom: '$10' }}>
            The MCP server prepares actions through its API; this wallet pairs itself to it and
            keeps the final say.
          </Text>

          <Card bordered borderWeight="light" css={{ marginBottom: '$10', textAlign: 'left' }}>
            <Card.Body css={{ padding: '$6 $8' }}>
              {FEATURES.map(feature => (
                <Row key={feature} align="center" css={{ gap: '$5', padding: '$3 0' }}>
                  <CheckCircleOutlineIcon style={{ fontSize: 18, color: `rgb(${SUCCESS_RGB})` }} />
                  <Text size={13} css={{ margin: 0 }}>
                    {feature}
                  </Text>
                </Row>
              ))}
            </Card.Body>
          </Card>

          <Button
            color="gradient"
            css={{ width: '100%' }}
            disabled={redirecting}
            onClick={onAuthorize}
            data-testid="mcp-authorize"
          >
            {redirecting ? <Loading size="sm" type="points" color="white" /> : 'Connect'}
          </Button>
          <Text size={11} color="$gray600" css={{ marginTop: '$6' }}>
            Click Allow on the consent page. The wallet pairs itself when you are back. {MCP_ORIGIN}
          </Text>
        </div>
      ) : null}

      {state.authorized && (state.phase === 'pairing' || state.phase === 'loading') ? (
        <div style={{ textAlign: 'center', padding: '48px 8px' }}>
          <Loading size="lg" />
          <Text h5 css={{ marginTop: '$8', marginBottom: '$2' }} data-testid="mcp-pairing">
            {state.phase === 'pairing' ? 'Pairing this wallet' : 'Loading'}
          </Text>
          <Text size={13} color="$gray600" css={{ marginBottom: '$8' }}>
            {state.phase === 'pairing'
              ? 'Approve the session proposal from the MCP server when it appears.'
              : 'Fetching the portfolio and open actions.'}
          </Text>
          {state.phase === 'pairing' ? (
            <Row justify="center">
              <Button
                size="sm"
                flat
                color="error"
                onClick={() => actions.disconnect()}
                data-testid="mcp-pairing-cancel"
              >
                Cancel and sign out
              </Button>
            </Row>
          ) : null}
        </div>
      ) : null}

      {state.authorized && state.phase === 'idle' ? (
        <div style={{ textAlign: 'center', padding: '48px 8px' }}>
          <Text h5 css={{ marginBottom: '$2' }}>
            Authorized, not paired
          </Text>
          <Text size={13} color="$gray600" css={{ marginBottom: '$8' }}>
            The MCP server has no session with this wallet yet.
          </Text>
          <Row justify="center" css={{ gap: '$4' }}>
            <Button color="gradient" onClick={() => actions.connect()} data-testid="mcp-pair-retry">
              Pair wallet
            </Button>
            <Button flat color="error" onClick={() => actions.disconnect()}>
              Sign out
            </Button>
          </Row>
        </div>
      ) : null}

      {ready && state.session && state.serverInfo ? (
        <>
          <McpSessionCard
            session={state.session as McpSession}
            serverInfo={state.serverInfo as McpServerInfo}
            busy={state.busy}
            onDisconnect={() => actions.disconnect()}
          />

          {currentAction ? (
            <McpActionCard
              action={currentAction}
              busy={state.busy}
              polling={state.polling}
              requestModalOpen={requestModalOpen}
              onSend={() => actions.sendCurrent()}
              onOpenRequest={() => {
                if (!actions.openPendingRequest()) void actions.pollCurrent()
              }}
              onCancel={() => actions.cancelCurrent()}
              onDismiss={actions.clearCurrent}
              onRetry={state.pendingRequest ? () => actions.retryCurrent() : undefined}
            />
          ) : null}

          {otherOpenActions.length ? (
            <McpSection
              title="Open actions"
              subtitle="Started elsewhere, e.g. by an agent. The server allows one open action at a time."
            >
              {otherOpenActions.map(action => (
                <Row
                  key={action.actionId}
                  justify="space-between"
                  align="center"
                  css={{ marginBottom: '$4', gap: '$4' }}
                  data-testid="mcp-open-action"
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text size={13} css={{ margin: 0, wordBreak: 'break-word' }}>
                      {action.summary}
                    </Text>
                    <McpStatusPill status={action.status} />
                  </div>
                  <Row css={{ width: 'auto', gap: '$2', flexShrink: 0 }}>
                    {action.status !== 'prepared' ? (
                      <Button
                        size="xs"
                        auto
                        bordered
                        disabled={state.busy || actionInFlight}
                        onClick={() => actions.watchAction(action.actionId)}
                      >
                        Watch
                      </Button>
                    ) : null}
                    <Button
                      size="xs"
                      auto
                      flat
                      color="error"
                      disabled={state.busy}
                      onClick={() => actions.cancelAction(action.actionId)}
                    >
                      Cancel
                    </Button>
                  </Row>
                </Row>
              ))}
            </McpSection>
          ) : null}

          <McpPortfolioCard
            portfolio={state.portfolio as McpPortfolio | null}
            error={state.portfolioError}
            chains={chains}
            chain={state.portfolioChain}
            onChainChange={chain => actions.setPortfolioChain(chain)}
            onRefresh={() => actions.reloadPortfolio()}
          />

          <McpActionForms
            chains={chains}
            caps={state.serverInfo.caps}
            disabled={state.busy || actionInFlight}
            onQuote={async input => (await McpApi.swapQuote(input)).data}
            onPrepareTransfer={input => actions.prepareTransfer(input)}
            onPrepareSwap={input => actions.prepareSwap(input)}
          />
        </>
      ) : null}
    </Fragment>
  )
}
