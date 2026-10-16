import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionTypes } from '@walletconnect/types'

import { AccountsSheet, KEY, sanctionBadge, useAccounts } from '@/components/Accounts'
import { namespacesFor, PairSheet, type PairState } from '@/components/PairSheet'
import { describe, RequestSheet, type Request } from '@/components/RequestSheet'
import {
  AppIcon,
  Avatar,
  copy,
  DevLog,
  ProjectPicker,
  toast,
  Toaster,
  useLog
} from '@/components/ui'
import { resetApp, startClient, type Started } from '@/lib/client'
import {
  EVENTS,
  explain,
  isSanctioned,
  short,
  UNSUPPORTED_METHOD,
  USER_DISCONNECTED,
  USER_REJECTED,
  when
} from '@/lib/common'
import { EMBER_ICON } from '@/lib/icons'

interface ActivityItem {
  id: number
  glyph: string
  title: string
  sub: string
  status: [string, string]
}
type View = 'apps' | 'requests' | 'activity'
let activityId = 0

const randomHash = () =>
  `0x${[...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('')}`

export default function Ember() {
  const { entries, log } = useLog()
  const { accounts, current, select, signerFor } = useAccounts()
  const [sdk, setSdk] = useState<Started>()
  const [failed, setFailed] = useState(false)
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([])
  const [view, setView] = useState<View>('apps')
  const [pair, setPair] = useState<PairState | null>(null)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [queue, setQueue] = useState<Request[]>([])
  const [active, setActive] = useState<Request>()
  const [requestOpen, setRequestOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  // Handlers registered once read the latest state through these.
  const queueRef = useRef(queue)
  queueRef.current = queue
  const openRef = useRef(false)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const record = (a: Omit<ActivityItem, 'id'>) =>
    setActivity(xs => [{ id: ++activityId, ...a }, ...xs])
  const refresh = useCallback(() => {
    if (sdk) setSessions([...sdk.client.session.getAll()])
  }, [sdk])

  const openRequest = useCallback((r: Request) => {
    openRef.current = true
    setActive(r)
    setRequestOpen(true)
    // A confirmation gives way to the request.
    setPair(p => (p?.phase === 'done' ? null : p))
  }, [])

  useEffect(() => {
    const metadata = {
      name: 'Ember Wallet',
      description: "A wallet on @walletconnect/sign-client/v3, the Sign v3 Rust SDK's WASM build",
      url: location.origin,
      icons: [EMBER_ICON]
    }
    startClient('wallet', metadata).then(
      s => {
        setSdk(s)
        log('ready', { clientId: s.clientId, projectId: s.projectId })
      },
      e => {
        setFailed(true)
        log('error', String(e?.message ?? e))
      }
    )
  }, [log])

  // As in v2: pair() resolves with the pairing, and the proposal comes as session_proposal.
  useEffect(() => {
    if (!sdk) return
    const { client } = sdk
    refresh()
    const gone = ({ topic }: { topic: string }) => {
      const s = sessionsRef.current.find(x => x.topic === topic)
      toast(`${s?.peer.metadata.name ?? 'The dApp'} disconnected`, 'warn')
      setQueue(q => q.filter(r => r.topic !== topic))
      refresh()
    }
    const handlers: [string, (args: any) => void][] = [
      ...EVENTS.map(ev => [ev, (args: unknown) => log(ev, args)] as [string, (args: any) => void]),
      ['session_proposal', proposal => setPair({ phase: 'proposal', proposal })],
      [
        'session_request',
        ({ id, topic, params }) => {
          const r: Request = { id, topic, chainId: params.chainId, request: params.request }
          setQueue(q => [...q, r])
          if (!openRef.current) openRequest(r)
        }
      ],
      ['session_delete', gone],
      ['session_expire', gone]
    ]
    for (const [ev, h] of handlers) client.on(ev as any, h)
    return () => {
      for (const [ev, h] of handlers) client.off(ev as any, h)
    }
  }, [sdk, refresh, log, openRequest])

  const startPair = useCallback(
    async (uri: string) => {
      if (!sdk) return
      setPair({ phase: 'loading' })
      try {
        await sdk.client.pair({ uri: uri.trim() })
      } catch (e) {
        log('error', String((e as Error).message))
        setPair({ phase: 'error', message: explain(e) })
      }
    },
    [sdk, log]
  )

  // Nimbus's "Open Ember Wallet" link carries the URI, also into a tab that's already open.
  useEffect(() => {
    if (!sdk) return
    const fromLink = () => {
      const uri = new URLSearchParams(location.hash.slice(1)).get('uri')
      if (!uri) return
      history.replaceState(null, '', location.pathname)
      void startPair(uri)
    }
    fromLink()
    addEventListener('hashchange', fromLink)
    return () => removeEventListener('hashchange', fromLink)
  }, [sdk, startPair])

  async function answerProposal(ok: boolean) {
    if (!sdk || pair?.phase !== 'proposal' || !current) return
    const { id, params } = pair.proposal
    const peer = params.proposer.metadata
    setPair({ ...pair, busy: true })
    try {
      if (ok) {
        const { acknowledged } = await sdk.client.approve({
          id,
          namespaces: namespacesFor(params, current.address)
        })
        await acknowledged()
      } else await sdk.client.reject({ id, reason: USER_REJECTED })
      log('call', { [ok ? 'approve' : 'reject']: id })
      record({
        glyph: ok ? '🔗' : '✕',
        title: ok ? `Connected to ${peer.name}` : `Declined ${peer.name}`,
        sub: ok ? short(current.address) : peer.url,
        status: ok ? ['Connected', 'ok'] : ['Declined', 'neutral']
      })
      if (ok) {
        setPair({ phase: 'done', name: peer.name })
        setTimeout(() => setPair(p => (p?.phase === 'done' ? null : p)), 1200)
      } else setPair(null)
      refresh()
    } catch (e) {
      log('error', String((e as Error).message))
      const blocked = /\bblocked\b/.test(String((e as Error).message))
      record({
        glyph: '⛔',
        title: `Couldn't connect to ${peer.name}`,
        sub: explain(e),
        status: [blocked ? 'Blocked' : 'Failed', 'warn']
      })
      setPair({ ...pair, busy: false, error: explain(e), blocked })
    }
  }

  async function answerRequest(approve: boolean) {
    if (!sdk || !active) return
    const r = active
    const d = describe(r)
    const peer = sessions.find(s => s.topic === r.topic)?.peer.metadata
    let response: { result: unknown } | { error: { code: number; message: string } }
    if (!approve) response = { error: USER_REJECTED }
    else if (r.request.method === 'personal_sign')
      response = {
        result: await signerFor(d.account)!.signMessage({ message: { raw: r.request.params[0] } })
      }
    else if (r.request.method === 'eth_sendTransaction') response = { result: randomHash() }
    else response = { error: UNSUPPORTED_METHOD }
    try {
      await sdk.client.respond({
        topic: r.topic,
        response: { id: r.id, jsonrpc: '2.0', ...response }
      })
      log('call', { respond: { id: r.id, ...response } })
      record({
        glyph: d.glyph,
        title: `${approve ? 'Approved' : 'Declined'}: ${d.kind.toLowerCase()}`,
        sub: `${peer?.name ?? 'dApp'} · ${d.summary}`,
        status: approve ? ['Approved', 'ok'] : ['Declined', 'neutral']
      })
    } catch (e) {
      log('error', String((e as Error).message))
      toast(explain(e), 'warn')
    }
    const rest = queueRef.current.filter(x => x !== r)
    setQueue(rest)
    openRef.current = false
    setRequestOpen(false)
    if (rest.length) setTimeout(() => !openRef.current && openRequest(rest[0]), 260)
  }

  async function disconnect(s: SessionTypes.Struct) {
    if (!sdk) return
    try {
      await sdk.client.disconnect({ topic: s.topic, reason: USER_DISCONNECTED })
      record({
        glyph: '⏏',
        title: `Disconnected ${s.peer.metadata.name}`,
        sub: s.peer.metadata.url,
        status: ['Closed', 'neutral']
      })
    } catch (e) {
      toast(explain(e), 'warn')
    }
    refresh()
  }

  async function emitEvent(s: SessionTypes.Struct) {
    if (!sdk) return
    try {
      await sdk.client.emit({
        topic: s.topic,
        chainId: 'eip155:1',
        event: { name: 'chainChanged', data: 1 }
      })
      toast(`Sent chainChanged to ${s.peer.metadata.name}`, 'ok')
    } catch (e) {
      toast(explain(e), 'warn')
    }
  }

  const sanctioned = isSanctioned(current?.address)
  const tabs: [View, string, number][] = [
    ['apps', 'Connected', sessions.length],
    ['requests', 'Requests', queue.length],
    ['activity', 'Activity', 0]
  ]

  return (
    <div className="wallet-page" style={{ minHeight: '100vh' }}>
      <Head>
        <title>Ember Wallet</title>
      </Head>
      <div className="phone">
        <div className="w-top">
          {current ? (
            <button className="acct-btn" id="account" onClick={() => setAccountsOpen(true)}>
              <Avatar seed={current.address} size={34} />
              <span style={{ minWidth: 0, textAlign: 'left' }}>
                <strong>{current.label}</strong>
                <small>{short(current.address)}</small>
              </span>
              <span className="faint">▾</span>
            </button>
          ) : (
            <span className="muted">Starting…</span>
          )}
          {sdk ? (
            <ProjectPicker app="wallet" projectId={sdk.projectId} />
          ) : (
            failed && <span className="badge warn">Failed to start</span>
          )}
        </div>

        {current && (
          <div className={`balance ${sanctioned ? 'sanctioned' : ''}`}>
            <div className="spread">
              <span className="label">Ethereum · Mainnet</span>
              {sanctioned ? (
                <span className="badge warn" style={{ background: 'rgba(255,122,69,.2)' }}>
                  {sanctionBadge(current)}
                </span>
              ) : (
                <span className="label">Demo account</span>
              )}
            </div>
            <div className="big">{current.watchOnly ? '—' : '1.2400 ETH'}</div>
            <div className="addr">{current.address}</div>
            <div className="actions">
              <button
                id="scan"
                disabled={!sdk}
                onClick={() => setPair({ phase: 'input', uri: '' })}
              >
                Connect dApp
              </button>
              <button onClick={() => copy(current.address)}>Copy address</button>
            </div>
          </div>
        )}

        <div className="tabs">
          {tabs.map(([k, label, n]) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
              {label}
              {k === 'requests' && n > 0 && <span className="count">{n}</span>}
              {k === 'apps' && n > 0 && <span className="faint">{n}</span>}
            </button>
          ))}
        </div>

        <section className="card">
          {view === 'apps' &&
            (sessions.length === 0 ? (
              <p className="empty">No connected dApps. Tap “Connect dApp”.</p>
            ) : (
              <div className="list">
                {sessions.map(s => {
                  const account = s.namespaces?.eip155?.accounts?.[0]?.split(':')[2] ?? ''
                  return (
                    <div key={s.topic} className="list-item">
                      <AppIcon
                        src={s.peer.metadata.icons?.[0]}
                        size={40}
                        name={s.peer.metadata.name}
                      />
                      <div className="grow">
                        <strong>{s.peer.metadata.name || 'dApp'}</strong>
                        <small>
                          {s.peer.metadata.url} · {short(account)}
                        </small>
                        <small>Expires {when(s.expiry)}</small>
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        <button className="btn secondary sm" onClick={() => emitEvent(s)}>
                          Event
                        </button>
                        <button
                          className="btn danger sm"
                          data-disconnect={s.topic}
                          onClick={() => disconnect(s)}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          {view === 'requests' &&
            (queue.length === 0 ? (
              <p className="empty">Nothing to approve.</p>
            ) : (
              <div className="list">
                {queue.map(r => {
                  const d = describe(r)
                  return (
                    <div key={`${r.topic}:${r.id}`} className="list-item">
                      <span className="act-icon">{d.glyph}</span>
                      <div className="grow">
                        <strong>{d.kind}</strong>
                        <small>{d.summary}</small>
                      </div>
                      <button
                        className="btn grad sm"
                        onClick={() => !openRef.current && openRequest(r)}
                      >
                        Review
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          {view === 'activity' &&
            (activity.length === 0 ? (
              <p className="empty">No activity yet.</p>
            ) : (
              <div className="list">
                {activity.map(a => (
                  <div key={a.id} className="list-item">
                    <span className="act-icon">{a.glyph}</span>
                    <div className="grow">
                      <strong>{a.title}</strong>
                      <small>{a.sub}</small>
                    </div>
                    <span className={`badge ${a.status[1]}`}>{a.status[0]}</span>
                  </div>
                ))}
              </div>
            ))}
        </section>
      </div>

      <DevLog entries={entries} narrow />
      <PairSheet
        state={pair}
        account={current}
        onPair={startPair}
        onAnswer={answerProposal}
        onAccounts={() => setAccountsOpen(true)}
        onClose={() => setPair(null)}
      />
      <RequestSheet
        open={requestOpen}
        request={active}
        peer={sessions.find(s => s.topic === active?.topic)?.peer.metadata}
        pending={queue.length}
        canSign={address => !!signerFor(address)}
        onAnswer={answerRequest}
      />
      <AccountsSheet
        open={accountsOpen}
        accounts={accounts}
        current={current}
        onSelect={select}
        onClose={() => setAccountsOpen(false)}
        onReset={() =>
          confirm("Forget Ember's identity, sessions and key?") && resetApp('wallet', [KEY])
        }
      />
      <Toaster />
    </div>
  )
}
