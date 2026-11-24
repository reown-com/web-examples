import type { SessionTypes } from '@walletconnect/types'

import { AppIcon, Avatar } from '@/components/ui'
import { short, when } from '@/lib/common'

export const accountOf = (s?: SessionTypes.Struct) =>
  s?.namespaces?.eip155?.accounts?.[0]?.split(':')[2] ?? ''

export function SessionCard({
  session,
  onPing,
  onDisconnect
}: {
  session: SessionTypes.Struct
  onPing: () => void
  onDisconnect: () => void
}) {
  const address = accountOf(session)
  const peer = session.peer.metadata
  return (
    <section className="card card-pad">
      <div className="card-head">
        <h2>Connected wallet</h2>
        <span className="badge ok">● Live</span>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <AppIcon src={peer.icons?.[0]} size={44} name={peer.name} />
        <div>
          <strong>{peer.name || 'Wallet'}</strong>
          <div className="faint" style={{ fontSize: 13 }}>
            {peer.url}
          </div>
        </div>
      </div>
      <dl className="kv">
        <dt>Account</dt>
        <dd>
          <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
            <Avatar seed={address} size={16} />
            {short(address)}
          </span>
        </dd>
        <dt>Connection</dt>
        <dd>
          <code title={session.topic}>{short(session.topic, 8)}</code>
        </dd>
        <dt>Expires</dt>
        <dd>{when(session.expiry)}</dd>
      </dl>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary sm" onClick={onPing}>
          Ping
        </button>
        <button className="btn danger sm" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    </section>
  )
}
