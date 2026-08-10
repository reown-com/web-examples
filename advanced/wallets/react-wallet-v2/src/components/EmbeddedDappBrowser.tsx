import { Button, Loading, Text } from '@nextui-org/react'
import { parseUri } from '@walletconnect/utils'
import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import PickerStore, { getPickerPopup, setPickerPopup } from '@/store/PickerStore'
import { dappOrigin } from '@/data/ExploreDapps'
import { walletkit } from '@/utils/WalletConnectUtil'

/**
 * Dapp Picker POC — the wallet's embedded browser.
 *
 * Renders the picker-opened dapp (iframe primary, popup fallback) with wallet
 * chrome around it, and is the sole intake point for the pairing URI the dapp
 * offers over postMessage. Auto-approval downstream trusts ONLY pairings
 * recorded here, and only after this component has checked:
 *   - event.origin === the tile's origin (the origin the wallet opened), and
 *   - event.source === the frame/popup the wallet itself created.
 * That is what scopes auto-approve to the wallet's own embedded frames.
 */
export default function EmbeddedDappBrowser() {
  const { activeDapp, activeUrl, status, statusDetail } = useSnapshot(PickerStore.state)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isPopup = activeDapp?.embed === 'popup'

  // URI intake: validate origin + source, then pair silently.
  useEffect(() => {
    if (!activeDapp || !activeUrl) return
    const expectedOrigin = dappOrigin(activeDapp)
    const dappId = activeDapp.id
    const pairedUris = new Set<string>()

    async function pair(uri: string) {
      try {
        const { topic } = parseUri(uri)
        // Record as picker-initiated BEFORE pairing so onSessionProposal sees it.
        PickerStore.registerPickerPairing(topic, expectedOrigin, dappId)
        PickerStore.setStatus('connecting')
        await walletkit.pair({ uri })
      } catch (e) {
        console.error('[picker] pair failed', e)
        PickerStore.setStatus('error', (e as Error).message)
      }
    }

    function onMessage(ev: MessageEvent) {
      // 1. Origin gate — must be the exact origin the wallet opened.
      if (ev.origin !== expectedOrigin) return
      // 2. Source gate — must be the frame/popup the wallet itself created.
      const validSource = isPopup
        ? !!getPickerPopup() && ev.source === getPickerPopup()
        : !!iframeRef.current && ev.source === iframeRef.current.contentWindow
      if (!validSource) return

      let data: any
      try {
        data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      } catch {
        return
      }
      if (!data || typeof data !== 'object') return

      if (data.type === 'wc_session_offer' && typeof data.uri === 'string') {
        if (pairedUris.has(data.uri)) return // dedupe repeat offers
        pairedUris.add(data.uri)
        void pair(data.uri)
      } else if (data.type === 'wc_session_settled') {
        PickerStore.setStatus('settled')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [activeDapp, activeUrl, isPopup])

  // Popup mode: reflect the popup being closed by the user, and clean up.
  useEffect(() => {
    if (!activeDapp || !isPopup) return
    const poll = setInterval(() => {
      const popup = getPickerPopup()
      if (!popup || popup.closed) {
        clearInterval(poll)
        setPickerPopup(null)
        PickerStore.closeDapp()
      }
    }, 500)
    return () => clearInterval(poll)
  }, [activeDapp, isPopup])

  if (!activeDapp || !activeUrl) return null

  const pill = statusPill(status, statusDetail)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250, // above the 450px card + its footer nav (z 200)
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0b0b'
      }}
      data-testid="embedded-dapp-browser"
    >
      {/* Wallet chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: '#111'
        }}
      >
        <Button
          auto
          light
          size="sm"
          onClick={() => PickerStore.closeDapp()}
          data-testid="embedded-close"
          css={{ minWidth: 'auto', px: '$4' }}
        >
          ✕ Close
        </Button>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: activeDapp.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16
          }}
        >
          {activeDapp.icon}
        </div>
        <Text b css={{ margin: 0 }}>
          {activeDapp.name}
        </Text>
        <Text small css={{ color: '$gray500', margin: 0 }}>
          {dappOrigin(activeDapp).replace(/^https?:\/\//, '')}
        </Text>
        <div style={{ marginLeft: 'auto' }}>
          <span
            data-testid="embedded-status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              color: pill.color,
              background: pill.bg
            }}
          >
            {status === 'connecting' && <Loading size="xs" />}
            {pill.label}
          </span>
        </div>
      </div>

      {/* Dapp surface */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {isPopup ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              textAlign: 'center',
              padding: 24
            }}
          >
            <Text h4>Opened in a separate window</Text>
            <Text css={{ color: '$gray500', maxWidth: 420 }}>
              {activeDapp.name} refuses to be framed, so the wallet opened it as a popup
              (a first-party context). The pairing URI arrives over{' '}
              <code>window.opener.postMessage</code> exactly as with the iframe. Closing that
              window returns you here.
            </Text>
            <Button
              auto
              onClick={() => {
                const popup = getPickerPopup()
                if (!popup || popup.closed) {
                  const reopened = window.open(activeUrl, `wc_picker_${activeDapp.id}`)
                  setPickerPopup(reopened)
                } else {
                  popup.focus()
                }
              }}
            >
              Focus / reopen window
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={activeUrl}
            title={activeDapp.name}
            allow="clipboard-read; clipboard-write; publickey-credentials-get *; payment"
            style={{ width: '100%', height: '100%', border: 0, background: '#0b0b0b' }}
          />
        )}
      </div>
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
      return { label: `Error${detail ? `: ${detail}` : ''}`, color: '#f31260', bg: 'rgba(243,18,96,0.12)' }
    default:
      return { label: 'Idle', color: '#889', bg: 'rgba(136,136,153,0.12)' }
  }
}
