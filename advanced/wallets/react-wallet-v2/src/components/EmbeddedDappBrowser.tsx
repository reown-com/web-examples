import { Button, Loading, Text } from '@nextui-org/react'
import { parseUri } from '@walletconnect/utils'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import PickerStore, { getPickerPopup, setPickerPopup } from '@/store/PickerStore'
import { dappOrigin, ExploreOpenMode } from '@/data/ExploreDapps'
import { walletkit } from '@/utils/WalletConnectUtil'

/**
 * Dapp Picker POC — the wallet's embedded browser.
 *
 * Renders the picker-opened dapp INSIDE the wallet UI (it fills the wallet
 * card's body; the nav footer stays visible), with wallet chrome on top. It is
 * the sole intake point for the pairing URI the dapp offers over postMessage.
 * Auto-approval downstream trusts ONLY pairings recorded here, and only after
 * this component has checked:
 *   - event.origin === the tile's origin (the origin the wallet opened), and
 *   - event.source === the frame/popup the wallet itself created.
 *
 * If the dapp can't be framed (e.g. it sends X-Frame-Options / CSP
 * frame-ancestors) the iframe silently fails — there is no load error for that.
 * We detect it with a timeout and offer a first-party popup, which XFO does not
 * block, so the handshake can still complete via window.opener.
 */
const CONNECT_TIMEOUT_MS = 15000

export default function EmbeddedDappBrowser() {
  const { activeDapp, activeUrl, activeMode, status, statusDetail } = useSnapshot(PickerStore.state)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [mode, setMode] = useState<ExploreOpenMode>('iframe')
  const [timedOut, setTimedOut] = useState(false)

  // Reset transient view state whenever a new dapp is opened, honoring the
  // globally-chosen open mode (Settings → Dapps open mode).
  useEffect(() => {
    setMode(activeMode)
    setTimedOut(false)
    setReloadKey(0)
  }, [activeDapp?.id, activeMode])

  // URI intake: validate origin + source, then pair silently.
  useEffect(() => {
    if (!activeDapp || !activeUrl) return
    const expectedOrigin = dappOrigin(activeDapp)
    const dappId = activeDapp.id
    const pairedUris = new Set<string>()

    async function pair(uri: string) {
      try {
        const { topic } = parseUri(uri)
        PickerStore.registerPickerPairing(topic, expectedOrigin, dappId)
        PickerStore.setStatus('connecting')
        await walletkit.pair({ uri })
      } catch (e) {
        console.error('[picker] pair failed', e)
        PickerStore.setStatus('error', (e as Error).message)
      }
    }

    function onMessage(ev: MessageEvent) {
      if (ev.origin !== expectedOrigin) return
      const popup = getPickerPopup()
      const fromFrame = !!iframeRef.current && ev.source === iframeRef.current.contentWindow
      const fromPopup = !!popup && ev.source === popup
      if (!fromFrame && !fromPopup) return

      let data: any
      try {
        data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      } catch {
        return
      }
      if (!data || typeof data !== 'object') return

      if (data.type === 'wc_session_offer' && typeof data.uri === 'string') {
        setTimedOut(false)
        if (pairedUris.has(data.uri)) return
        pairedUris.add(data.uri)
        void pair(data.uri)
      } else if (data.type === 'wc_session_settled') {
        setTimedOut(false)
        PickerStore.setStatus('settled')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [activeDapp, activeUrl])

  // Detect a framed dapp that never hands off a URI (framing blocked, or slow).
  // Only relevant for iframe mode — popup/new-tab show their own pane.
  useEffect(() => {
    if (!activeDapp || mode !== 'iframe') return
    setTimedOut(false)
    const t = setTimeout(() => {
      if (PickerStore.state.status !== 'settled') setTimedOut(true)
    }, CONNECT_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [activeDapp?.id, reloadKey, mode])

  if (!activeDapp || !activeUrl) return null

  const pill = statusPill(status, statusDetail)
  const showWindowPane = mode === 'popup' || mode === 'newtab'
  const showTimeout = mode === 'iframe' && timedOut && status !== 'settled'

  // Escape hatch from a framing-blocked iframe: open a first-party popup.
  function openInWindow() {
    const popup = window.open(activeUrl!, `wc_picker_${activeDapp!.id}`, 'width=460,height=820')
    setPickerPopup(popup)
    setMode('popup')
    setTimedOut(false)
    PickerStore.setStatus('connecting')
  }

  // Re-focus (or re-open) the popup/tab for the current mode.
  function reopenActiveWindow() {
    const existing = getPickerPopup()
    if (existing && !existing.closed) {
      existing.focus()
      return
    }
    const reopened =
      mode === 'newtab'
        ? window.open(activeUrl!, `wc_picker_${activeDapp!.id}`)
        : window.open(activeUrl!, `wc_picker_${activeDapp!.id}`, 'width=460,height=820')
    setPickerPopup(reopened)
    PickerStore.setStatus('connecting')
  }

  function retryIframe() {
    setPickerPopup(null)
    setMode('iframe')
    setTimedOut(false)
    PickerStore.setStatus('connecting')
    setReloadKey(k => k + 1)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}
      data-testid="embedded-dapp-browser"
    >
      {/* Wallet chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 2px 12px'
        }}
      >
        <Button
          auto
          light
          size="xs"
          onClick={() => PickerStore.closeDapp()}
          data-testid="embedded-close"
          css={{ minWidth: 'auto', px: '$3' }}
        >
          ✕
        </Button>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: activeDapp.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0
          }}
        >
          {activeDapp.icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text b css={{ margin: 0, lineHeight: 1.1 }}>
            {activeDapp.name}
          </Text>
          <Text
            css={{
              margin: 0,
              fontSize: 11,
              color: '$gray500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {dappOrigin(activeDapp).replace(/^https?:\/\//, '')}
          </Text>
        </div>
        <span
          data-testid="embedded-status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            color: pill.color,
            background: pill.bg,
            flexShrink: 0
          }}
        >
          {status === 'connecting' && !showTimeout && <Loading size="xs" />}
          {pill.label}
        </span>
      </div>

      {/* Dapp surface */}
      <div
        style={{
          position: 'relative',
          height: '72vh',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e6e8ec',
          background: '#ffffff'
        }}
      >
        {showWindowPane ? (
          <CenteredPane>
            <Text h5 css={{ margin: 0 }}>
              {mode === 'newtab' ? 'Opened in a new tab' : 'Opened in a separate window'}
            </Text>
            <Text css={{ color: '$gray500', fontSize: 13 }}>
              {activeDapp.name} is running as a first-party{' '}
              {mode === 'newtab' ? 'browser tab' : 'popup window'} and connects over{' '}
              <code>window.opener</code>. Sign prompts still appear here in the wallet.
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button auto size="sm" onClick={reopenActiveWindow}>
                {mode === 'newtab' ? 'Focus / reopen tab' : 'Focus / reopen window'}
              </Button>
              <Button auto size="sm" flat onClick={retryIframe}>
                Embed here instead
              </Button>
            </div>
          </CenteredPane>
        ) : showTimeout ? (
          <CenteredPane>
            <Text h5 css={{ margin: 0 }}>
              Taking longer than expected
            </Text>
            <Text css={{ color: '$gray500', fontSize: 13 }}>
              The dapp hasn&apos;t completed the handshake. It may be blocking
              embedding (<code>X-Frame-Options</code> / CSP), or still loading. You
              can open it in a separate window (which bypasses framing blocks) or
              retry.
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button auto size="sm" onClick={openInWindow} data-testid="embedded-open-window">
                Open in a separate window
              </Button>
              <Button auto size="sm" flat onClick={retryIframe} data-testid="embedded-retry">
                Retry
              </Button>
            </div>
          </CenteredPane>
        ) : (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={activeUrl}
            title={activeDapp.name}
            allow="clipboard-read; clipboard-write; publickey-credentials-get *; payment"
            style={{ width: '100%', height: '100%', border: 0, background: '#ffffff' }}
          />
        )}
      </div>
    </div>
  )
}

function CenteredPane({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 12,
        padding: 24
      }}
    >
      {children}
    </div>
  )
}

function statusPill(status: string, detail?: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'connecting':
      return { label: 'Connecting…', color: '#f5d90a', bg: 'rgba(245,217,10,0.12)' }
    case 'settled':
      return { label: 'Connected · fees active', color: '#17c964', bg: 'rgba(23,201,100,0.12)' }
    case 'error':
      return {
        label: `Error${detail ? `: ${detail}` : ''}`,
        color: '#f31260',
        bg: 'rgba(243,18,96,0.12)'
      }
    default:
      return { label: 'Idle', color: '#889', bg: 'rgba(136,136,153,0.12)' }
  }
}
