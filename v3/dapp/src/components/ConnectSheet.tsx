import { AppIcon, copy, Sheet, SheetHead, useNow } from '@/components/ui'
import { EMBER_ICON, NIMBUS_ICON } from '@/lib/icons'

export const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:3001'

export type ConnectState =
  | { phase: 'creating' }
  | { phase: 'waiting'; uri: string; expiresAt: number }
  | { phase: 'error'; message: string; uri?: string }

export function ConnectSheet({
  state,
  onClose
}: {
  state: ConnectState | null
  onClose: () => void
}) {
  const now = useNow(state?.phase === 'waiting')
  let body
  if (!state || state.phase === 'creating') {
    body = (
      <div className="waiting">
        <span className="spinner" />
        Creating a connection…
      </div>
    )
  } else if (state.phase === 'error') {
    body = <div className="callout warn">{state.message}</div>
  } else {
    const left = Math.max(0, state.expiresAt - Math.floor(now / 1000))
    body = (
      <div className="stack">
        <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          Open the link in Ember, or copy the URI into any Sign v3 wallet.
        </p>
        <a
          className="btn grad lg block"
          id="open-wallet"
          href={`${WALLET_URL}/#uri=${encodeURIComponent(state.uri)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Ember Wallet
        </a>
        <button className="btn secondary block" onClick={() => copy(state.uri)}>
          Copy connection URI
        </button>
        <div className="uri-box" id="uri">
          {state.uri}
        </div>
        <div className="waiting">
          <span className="spinner" />
          Waiting for approval · {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </div>
      </div>
    )
  }
  return (
    <Sheet open={!!state} onClose={onClose}>
      <SheetHead title="Connect a wallet" onClose={onClose} />
      <div className="connect-art">
        <AppIcon src={NIMBUS_ICON} size={52} />
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <AppIcon src={EMBER_ICON} size={52} />
      </div>
      {body}
    </Sheet>
  )
}
