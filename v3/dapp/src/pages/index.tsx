import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'
import { verifyMessage } from 'viem'
import type { SessionTypes } from '@walletconnect/types'

import { ActionCard, ActivityCard, type Activity, type Form, type Kind } from '@/components/Actions'
import { ConnectSheet, type ConnectState } from '@/components/ConnectSheet'
import { accountOf, SessionCard } from '@/components/SessionCard'
import { Avatar, copy, DevLog, ProjectPicker, toast, Toaster, useLog } from '@/components/ui'
import { resetApp, startClient, type Started } from '@/lib/client'
import {
  EVENTS,
  explain,
  isSanctioned,
  SANCTIONED,
  short,
  TRANSFER,
  USDC,
  USER_DISCONNECTED
} from '@/lib/common'
import { NIMBUS_ICON } from '@/lib/icons'

// The wallet answers within this, or the call fails. The SDK adds 30 s before giving up.
const DEADLINE_S = 15
const optionalNamespaces = {
  eip155: {
    chains: ['eip155:1'],
    methods: ['personal_sign', 'eth_sendTransaction'],
    events: ['chainChanged', 'accountsChanged']
  }
}

const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a)
const hexOf = (text: string) =>
  `0x${[...new TextEncoder().encode(text)].map(b => b.toString(16).padStart(2, '0')).join('')}`
const units = (amount: string, decimals: number) => {
  const [i, f = ''] = amount.split('.')
  return (
    BigInt(i || '0') * 10n ** BigInt(decimals) +
    BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0')
  )
}
const word = (hex: string) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0')

async function verify(address: string, message: string, signature: string) {
  try {
    const ok = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`
    })
    return ok ? `Signature verified for ${short(address)}` : "Signature doesn't match the account"
  } catch {
    return 'Signature not checked'
  }
}

export default function Nimbus() {
  const { entries, log } = useLog()
  const [sdk, setSdk] = useState<Started>()
  const [failed, setFailed] = useState(false)
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([])
  const [connect, setConnect] = useState<ConnectState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activity, setActivity] = useState<Activity[]>([])
  const session = [...sessions].sort((a, b) => b.expiry - a.expiry)[0]
  const sessionRef = useRef(session)
  sessionRef.current = session

  const refresh = useCallback(() => {
    if (sdk) setSessions([...sdk.client.session.getAll()])
  }, [sdk])

  useEffect(() => {
    const metadata = {
      name: 'Nimbus',
      description: "A dApp on @walletconnect/sign-client/v3, the Sign v3 Rust SDK's WASM build",
      url: location.origin,
      icons: [NIMBUS_ICON]
    }
    startClient('dapp', metadata).then(
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

  useEffect(() => {
    if (!sdk) return
    const { client } = sdk
    refresh()
    const handlers: [string, (args: any) => void][] = [
      ...EVENTS.map(ev => [ev, (args: unknown) => log(ev, args)] as [string, (args: any) => void]),
      [
        'session_delete',
        ({ topic }: { topic: string }) => {
          if (sessionRef.current?.topic === topic) toast('The wallet disconnected', 'warn')
          refresh()
        }
      ],
      ['session_expire', refresh],
      ['session_update', refresh],
      ['session_extend', refresh],
      [
        'session_event',
        ({ params }: { params: { event: { name: string; data: unknown } } }) =>
          toast(`Wallet event: ${params.event.name} → ${JSON.stringify(params.event.data)}`)
      ]
    ]
    for (const [ev, h] of handlers) client.on(ev as any, h)
    return () => {
      for (const [ev, h] of handlers) client.off(ev as any, h)
    }
  }, [sdk, refresh, log])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) =>
      !(e.target as Element).closest('.account-pill') && setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  async function openConnect() {
    if (!sdk) return
    setConnect({ phase: 'creating' })
    try {
      const { uri, approval } = await sdk.client.connect({ optionalNamespaces })
      log('call', { connect: { uri } })
      const expiresAt = Number(new URLSearchParams(uri!.split('?')[1]).get('expiryTimestamp'))
      setConnect({ phase: 'waiting', uri: uri!, expiresAt })
      approval().then(
        s => {
          setConnect(null)
          toast(`Connected to ${s.peer.metadata.name}`, 'ok')
          refresh()
        },
        e => {
          log('error', e)
          const message =
            e.code === 5000
              ? `The wallet declined: ${e.message}`
              : e.code === 6
                ? /Replaced/.test(e.message)
                  ? 'Replaced by a newer connection request.'
                  : 'Nobody answered in time.'
                : explain(e)
          setConnect(c => (c && 'uri' in c && c.uri === uri ? { phase: 'error', message, uri } : c))
        }
      )
    } catch (e) {
      log('error', String((e as Error).message))
      setConnect({ phase: 'error', message: explain(e) })
    }
  }

  const update = (id: string, patch: Partial<Activity>) =>
    setActivity(xs => xs.map(a => (a.id === id ? { ...a, ...patch } : a)))

  async function submit(kind: Kind, form: Form) {
    if (!sdk || !session) return
    const from = accountOf(session)
    let title: string
    let detail: string
    let request: { method: string; params: unknown[] }
    if (kind === 'sign') {
      title = 'Sign message'
      detail = form.message
      request = { method: 'personal_sign', params: [hexOf(form.message), from] }
    } else {
      const to = kind === 'eth' ? form.ethTo : form.usdcTo
      if (!isAddress(to)) return toast('Enter a valid 0x address', 'warn')
      const amount = kind === 'eth' ? form.ethAmount : form.usdcAmount
      title = kind === 'eth' ? `Send ${amount} ETH` : `Send ${amount} USDC`
      detail = `to ${to}`
      const tx =
        kind === 'eth'
          ? { from, to, value: `0x${units(amount, 18).toString(16)}` }
          : { from, to: USDC, data: `${TRANSFER}${word(to)}${word(units(amount, 6).toString(16))}` }
      request = { method: 'eth_sendTransaction', params: [tx] }
    }
    const id = crypto.randomUUID()
    const risky = isSanctioned(from) || detail.toLowerCase().includes(SANCTIONED.toLowerCase())
    setActivity(xs => [
      {
        id,
        kind,
        title,
        detail,
        status: 'pending',
        giveUpAt: Date.now() + (DEADLINE_S + 30) * 1000,
        risky
      },
      ...xs
    ])
    try {
      const result = await sdk.client.request<string>({
        topic: session.topic,
        chainId: 'eip155:1',
        request,
        expiry: DEADLINE_S
      })
      log('call', { [request.method]: result })
      const note =
        kind === 'sign'
          ? await verify(from, form.message, result)
          : 'Simulated by the demo wallet, not broadcast'
      update(id, { status: 'done', result, note })
    } catch (e) {
      log('error', e)
      // As in v2: the wallet's { code, message }, or an Error with code 6 when nothing came back.
      const err = e as { code?: unknown; message: string }
      const status =
        err.code === 6 ? 'expired' : typeof err.code === 'number' ? 'rejected' : 'failed'
      update(id, {
        status,
        note: status === 'rejected' ? `Declined in the wallet: ${err.message}` : explain(e)
      })
    }
  }

  async function ping() {
    setMenuOpen(false)
    if (!sdk || !session) return
    const t = performance.now()
    try {
      await sdk.client.ping({ topic: session.topic })
      toast(`Wallet answered the ping in ${Math.round(performance.now() - t)} ms`, 'ok')
    } catch (e) {
      toast(explain(e), 'warn')
    }
  }

  async function disconnect() {
    if (!sdk || !session) return
    try {
      await sdk.client.disconnect({ topic: session.topic, reason: USER_DISCONNECTED })
      log('call', { disconnect: 'ok' })
    } catch (e) {
      log('error', String((e as Error).message))
    }
    setMenuOpen(false)
    refresh()
  }

  const address = accountOf(session)

  return (
    <div className="dapp">
      <Head>
        <title>Nimbus</title>
      </Head>
      <nav className="topbar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NIMBUS_ICON} alt="" />
          Nimbus <small>Sign v3 demo</small>
        </div>
        <div className="top-actions">
          {!sdk && (
            <span className={failed ? 'badge warn' : 'muted'}>
              {failed ? 'Failed to start' : 'Starting…'}
            </span>
          )}
          {sdk && (
            <>
              <ProjectPicker app="dapp" projectId={sdk.projectId} />
              <span className="chip">
                <i
                  className="chip-dot"
                  style={{ background: '#627eea', boxShadow: '0 0 0 3px rgba(98,126,234,.18)' }}
                />
                Ethereum
              </span>
              {session ? (
                <div className="account-pill">
                  <button
                    className="chip pill-btn"
                    id="account"
                    onClick={() => setMenuOpen(o => !o)}
                  >
                    <Avatar seed={address} size={22} />
                    {short(address)}
                    {isSanctioned(address) && <span className="badge warn">sanctioned</span>}
                    <span className="faint">▾</span>
                  </button>
                  {menuOpen && (
                    <div className="menu">
                      <div className="menu-head row">
                        <Avatar seed={address} size={36} />
                        <div>
                          <strong>{short(address)}</strong>
                          <div className="faint" style={{ fontSize: 12 }}>
                            via {session.peer.metadata.name}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => copy(address)}>Copy address</button>
                      <button onClick={ping}>Ping wallet</button>
                      <button className="danger-text" onClick={disconnect}>
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button className="btn grad sm" id="connect" onClick={openConnect}>
                  Connect wallet
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      <main id="main" className={`dapp-main ${session ? '' : 'solo'}`}>
        <div className="col">
          {session ? (
            <>
              <ActionCard account={address} onSubmit={submit} />
              <ActivityCard items={activity} />
            </>
          ) : (
            <section className="card hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-mark" src={NIMBUS_ICON} alt="" />
              <h1>Sign and send, over Sign v3</h1>
              <p>
                Connect a wallet to request signatures and transactions. Every message travels
                through the v3 Relay.
              </p>
              <button className="btn grad lg" onClick={openConnect} disabled={!sdk}>
                Connect wallet
              </button>
            </section>
          )}
        </div>
        <div className="col" id="right">
          {session && <SessionCard session={session} onPing={ping} onDisconnect={disconnect} />}
        </div>
      </main>

      <div className="dapp-foot">
        <button
          id="reset"
          className="btn ghost sm"
          onClick={() => confirm("Forget Nimbus's identity and sessions?") && resetApp('dapp')}
        >
          Reset Nimbus
        </button>
      </div>
      <DevLog entries={entries} />
      <ConnectSheet state={connect} onClose={() => setConnect(null)} />
      <Toaster />
    </div>
  )
}
