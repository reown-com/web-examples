import { Button, Loading, Text } from '@nextui-org/react'
import { parseUri } from '@walletconnect/utils'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import PickerStore, { getPickerPopup, setPickerPopup } from '@/store/PickerStore'
import { dappOrigin, ExploreOpenMode } from '@/data/ExploreDapps'
import { walletkit } from '@/utils/WalletConnectUtil'

/**
 * Dapp Picker POC — the wallet's embedded browser. Three presentations, driven
 * by the global open mode (Settings → Dapps open mode):
 *   - iframe: fills the Dapps tab; framed, URI over window.parent.
 *   - popup:  a floating modal INSIDE the wallet; also a framed iframe, URI over
 *             window.parent (same transport as iframe, just a modal card).
 *   - newtab: a real separate browser tab (window.open); URI over window.opener,
 *             which XFO does not block.
 *
 * Sole intake point for the pairing URI. Auto-approval downstream trusts ONLY
 * pairings recorded here, and only after checking event.origin === the tile's
 * origin AND event.source === the frame/tab the wallet itself created.
 *
 * Framed modes (iframe/popup) can silently fail if the dapp forbids framing
 * (X-Frame-Options / CSP) — there is no load error — so a timeout offers a
 * new-tab escape, which is first-party and bypasses the block.
 */
const CONNECT_TIMEOUT_MS = 15000

export default function EmbeddedDappBrowser() {
  const { activeDapp, activeUrl, activeMode, status, statusDetail } = useSnapshot(PickerStore.state)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [mode, setMode] = useState<ExploreOpenMode>('iframe')
  const [timedOut, setTimedOut] = useState(false)

  const isFramed = mode === 'iframe' || mode === 'popup'

  // Reset transient view state whenever a new dapp is opened, honoring the
  // globally-chosen open mode.
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
  useEffect(() => {
    if (!activeDapp || !isFramed) return
    setTimedOut(false)
    const t = setTimeout(() => {
      if (PickerStore.state.status !== 'settled') setTimedOut(true)
    }, CONNECT_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [activeDapp?.id, reloadKey, mode, isFramed])

  if (!activeDapp || !activeUrl) return null

  const pill = statusPill(status, statusDetail)
  const showTimeout = isFramed && timedOut && status !== 'settled'
  const isModal = mode !== 'iframe' // popup (framed modal) or newtab (info card)

  // Framing-blocked escape: open a real separate tab (bypasses X-Frame-Options).
  function openInNewTab() {
    setPickerPopup(window.open(activeUrl!, `wc_picker_${activeDapp!.id}`))
    setMode('newtab')
    setTimedOut(false)
    PickerStore.setStatus('connecting')
  }

  // Re-focus (or re-open) the separate tab for newtab mode.
  function reopenTab() {
    const existing = getPickerPopup()
    if (existing && !existing.closed) {
      existing.focus()
      return
    }
    setPickerPopup(window.open(activeUrl!, `wc_picker_${activeDapp!.id}`))
    PickerStore.setStatus('connecting')
  }

  function retryFramed() {
    setPickerPopup(null)
    setMode(activeMode === 'newtab' ? 'iframe' : activeMode)
    setTimedOut(false)
    PickerStore.setStatus('connecting')
    setReloadKey(k => k + 1)
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px 12px' }}>
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
  )

  const surface = (
    <div
      style={{
        position: 'relative',
        flex: isModal ? 1 : undefined,
        height: isModal ? undefined : '72vh',
        minHeight: 0,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e6e8ec',
        background: '#ffffff'
      }}
    >
      {mode === 'newtab' ? (
        <CenteredPane>
          <Text h5 css={{ margin: 0 }}>
            Opened in a new tab
          </Text>
          <Text css={{ color: '$gray500', fontSize: 13 }}>
            {activeDapp.name} is running as a first-party browser tab and connects over{' '}
            <code>window.opener</code>. Sign prompts still appear here in the wallet.
          </Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button auto size="sm" onClick={reopenTab}>
              Focus / reopen tab
            </Button>
          </div>
        </CenteredPane>
      ) : showTimeout ? (
        <CenteredPane>
          <Text h5 css={{ margin: 0 }}>
            Taking longer than expected
          </Text>
          <Text css={{ color: '$gray500', fontSize: 13 }}>
            The dapp hasn&apos;t completed the handshake. It may be blocking embedding
            (<code>X-Frame-Options</code> / CSP), or still loading. Open it in a new tab
            (which bypasses framing blocks) or retry.
          </Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button auto size="sm" onClick={openInNewTab} data-testid="embedded-open-window">
              Open in a new tab
            </Button>
            <Button auto size="sm" flat onClick={retryFramed} data-testid="embedded-retry">
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
  )

  const body = (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      data-testid="embedded-dapp-browser"
    >
      {header}
      {surface}
    </div>
  )

  // iframe mode renders in-flow (fills the Dapps tab). popup/newtab render as a
  // floating modal card over the wallet.
  if (!isModal) return body

  return (
    <div
      onClick={() => PickerStore.closeDapp()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(15,18,25,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      data-testid="embedded-dapp-modal"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 94vw)',
          height: mode === 'newtab' ? 'auto' : 'min(760px, 86vh)',
          maxHeight: '86vh',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          padding: '14px 14px 16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {body}
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
