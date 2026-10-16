import { useState } from 'react'

import { useNow } from '@/components/ui'
import { SANCTIONED, short } from '@/lib/common'

export type Kind = 'sign' | 'eth' | 'usdc'
export interface Form {
  message: string
  ethTo: string
  ethAmount: string
  usdcTo: string
  usdcAmount: string
}
export interface Activity {
  id: string
  kind: Kind
  title: string
  detail: string
  status: 'pending' | 'done' | 'rejected' | 'expired' | 'failed'
  giveUpAt: number
  risky: boolean
  note?: string
  result?: string
}

const SAMPLE = '0x2222222222222222222222222222222222222222'
export const initialForm: Form = {
  message: 'Welcome to Nimbus! Sign to verify you own this account.',
  ethTo: SAMPLE,
  ethAmount: '0.01',
  usdcTo: SAMPLE,
  usdcAmount: '25'
}

const TABS: [Kind, string][] = [
  ['sign', 'Sign'],
  ['eth', 'Send ETH'],
  ['usdc', 'Send USDC']
]

export function ActionCard({
  account,
  onSubmit
}: {
  account: string
  onSubmit: (kind: Kind, form: Form) => void
}) {
  const [tab, setTab] = useState<Kind>('sign')
  const [form, setForm] = useState(initialForm)
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))

  const recipient = (key: 'ethTo' | 'usdcTo') => (
    <div className="stack" style={{ gap: 8 }}>
      <label className="field">
        <span>Recipient</span>
        <input
          className="input mono"
          value={form[key]}
          placeholder="0x…"
          onChange={e => set({ [key]: e.target.value.trim() })}
        />
      </label>
      <div className="quick">
        <button onClick={() => set({ [key]: SAMPLE })}>Sample address</button>
        <button onClick={() => set({ [key]: account })}>My address</button>
        <button className="risk" onClick={() => set({ [key]: SANCTIONED })}>
          Sanctioned address
        </button>
      </div>
    </div>
  )

  const tokenBox = (key: 'ethAmount' | 'usdcAmount', symbol: string, color: string) => (
    <div className="token-box">
      <div className="spread">
        <span>You send</span>
        <span>Balance: demo</span>
      </div>
      <div className="spread">
        <input
          className="amount"
          value={form[key]}
          inputMode="decimal"
          onChange={e => set({ [key]: e.target.value })}
        />
        <span className="token">
          <i style={{ background: color }} />
          {symbol}
        </span>
      </div>
    </div>
  )

  return (
    <section className="card action-card">
      <div className="segmented">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'sign' && (
        <label className="field">
          <span>Message</span>
          <textarea
            className="input"
            id="message"
            rows={3}
            value={form.message}
            onChange={e => set({ message: e.target.value })}
          />
        </label>
      )}
      {tab === 'eth' && (
        <>
          {tokenBox('ethAmount', 'ETH', '#627eea')}
          {recipient('ethTo')}
        </>
      )}
      {tab === 'usdc' && (
        <>
          {tokenBox('usdcAmount', 'USDC', '#2775ca')}
          {recipient('usdcTo')}
          <p className="faint" style={{ fontSize: 12.5 }}>
            An ERC-20 transfer: the recipient travels inside the calldata.
          </p>
        </>
      )}
      <button className="btn grad lg block" id="submit" onClick={() => onSubmit(tab, form)}>
        {tab === 'sign' ? 'Request signature' : 'Review in wallet'}
      </button>
    </section>
  )
}

const STATUS: Record<Activity['status'], [string, string]> = {
  pending: ['Waiting', 'neutral'],
  done: ['Confirmed', 'ok'],
  rejected: ['Declined', 'amber'],
  expired: ['No answer', 'warn'],
  failed: ['Failed', 'warn']
}
const GLYPH: Record<Kind, string> = { sign: '✍️', eth: 'Ξ', usdc: '$' }

export function ActivityCard({ items }: { items: Activity[] }) {
  const now = useNow(items.some(a => a.status === 'pending'))
  return (
    <section className="card card-pad">
      <div className="card-head">
        <h2>Activity</h2>
      </div>
      <div id="activity" className="activity">
        {items.length === 0 && <p className="empty">Requests you send appear here.</p>}
        {items.map(a => {
          const [label, kind] = STATUS[a.status]
          const secs = Math.max(0, Math.ceil((a.giveUpAt - now) / 1000))
          const color = a.status === 'done' ? 'ok' : a.status === 'pending' ? 'muted' : 'warn'
          return (
            <div key={a.id} className="act" data-status={a.status}>
              <span className="act-icon">{GLYPH[a.kind]}</span>
              <div className="act-body">
                <div className="spread">
                  <strong>{a.title}</strong>
                  <span className={`badge ${kind}`}>
                    {a.status === 'pending' && <span className="spinner" />}
                    {a.status === 'pending' ? `${label} · ${secs}s` : label}
                  </span>
                </div>
                <span className="faint" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
                  {a.detail}
                </span>
                {a.note && (
                  <span className="act-note" style={{ fontSize: 13, color: `var(--${color})` }}>
                    {a.note}
                  </span>
                )}
                {a.result && <span className="mono">{short(String(a.result), 18)}</span>}
                {a.risky && a.status === 'pending' && (
                  <span className="faint" style={{ fontSize: 12.5 }}>
                    Names the sanctioned address: the Relay may withhold it.
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
