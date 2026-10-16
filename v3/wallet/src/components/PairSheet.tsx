import { useState } from 'react'
import type { SessionTypes, SignClientTypes } from '@walletconnect/types'

import { AppIcon, Avatar, Sheet, SheetHead } from '@/components/ui'
import type { Account } from '@/components/Accounts'
import { isSanctioned, short, when } from '@/lib/common'

export type Proposal = SignClientTypes.EventArguments['session_proposal']

export type PairState =
  | { phase: 'input'; uri: string }
  | { phase: 'loading' }
  | { phase: 'proposal'; proposal: Proposal; busy?: boolean; error?: string; blocked?: boolean }
  | { phase: 'done'; name: string }
  | { phase: 'error'; message: string }

/** Every requested and optional chain, with the account to share on each. */
export function namespacesFor(
  params: Proposal['params'],
  address: string
): SessionTypes.Namespaces {
  const out: SessionTypes.Namespaces = {}
  for (const group of [params.requiredNamespaces, params.optionalNamespaces]) {
    for (const [key, ns] of Object.entries(group ?? {})) {
      const chains = ns.chains ?? [key]
      const prev = out[key] ?? { chains: [], methods: [], events: [], accounts: [] }
      const add = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])]
      out[key] = {
        chains: add(prev.chains, chains),
        methods: add(prev.methods, ns.methods),
        events: add(prev.events, ns.events),
        accounts: add(
          prev.accounts,
          chains.map(c => `${c}:${address}`)
        )
      }
    }
  }
  return out
}

export function PairSheet({
  state,
  account,
  onPair,
  onAnswer,
  onAccounts,
  onClose
}: {
  state: PairState | null
  account?: Account
  onPair: (uri: string) => void
  onAnswer: (ok: boolean) => void
  onAccounts: () => void
  onClose: () => void
}) {
  const [uri, setUri] = useState('')
  let body
  if (!state || state.phase === 'loading') {
    body = (
      <div className="waiting" style={{ padding: '40px 0' }}>
        <span className="spinner" />
        Fetching the request…
      </div>
    )
  } else if (state.phase === 'input') {
    body = (
      <>
        <SheetHead title="Connect to a dApp" onClose={onClose} />
        <div className="stack">
          <p className="muted" style={{ fontSize: 14 }}>
            Paste the connection URI from the dApp.
          </p>
          <textarea
            className="input mono"
            id="uri"
            rows={4}
            placeholder="wc:…@2?relay-protocol=irn&symKey=…"
            value={uri}
            onChange={e => setUri(e.target.value)}
          />
          <button className="btn grad lg block" id="pair-btn" onClick={() => onPair(uri)}>
            Connect
          </button>
        </div>
      </>
    )
  } else if (state.phase === 'error') {
    body = (
      <>
        <SheetHead title="Couldn't connect" onClose={onClose} />
        <div className="callout warn">{state.message}</div>
      </>
    )
  } else if (state.phase === 'done') {
    body = (
      <div className="req-hero" style={{ padding: '30px 0' }}>
        <div style={{ fontSize: 44 }}>✓</div>
        <h3>Connected to {state.name}</h3>
        <p className="muted">You can return to the dApp.</p>
      </div>
    )
  } else {
    const { params } = state.proposal
    const peer = params.proposer.metadata
    const ns = namespacesFor(params, account?.address ?? '')
    const methods = Object.values(ns).flatMap(n => n.methods)
    body = (
      <>
        <SheetHead title="Connection request" onClose={onClose} />
        <div className="req-hero">
          <AppIcon src={peer.icons?.[0]} size={64} name={peer.name} />
          <h3>{peer.name || 'Unknown dApp'}</h3>
          <span className="from">{peer.url || 'no URL'}</span>
          <p className="muted" style={{ fontSize: 14 }}>
            wants to connect to your wallet
          </p>
        </div>
        <div
          className="card"
          style={{ padding: '14px 16px', margin: '16px 0 12px', boxShadow: 'none' }}
        >
          <div className="stack" style={{ gap: 10 }}>
            <div className="perm">
              <i>✓</i>
              <span>See your account address</span>
            </div>
            <div className="perm">
              <i>✓</i>
              <span>Ask you to approve: {methods.join(', ') || 'no methods'}</span>
            </div>
            <div className="perm">
              <i>✓</i>
              <span>
                Network:{' '}
                {Object.values(ns)
                  .flatMap(n => n.chains ?? [])
                  .join(', ')}
              </span>
            </div>
            <div className="perm">
              <i style={{ color: 'var(--muted)' }}>◎</i>
              <span className="muted">
                Monitored: the Relay can read requests · answer by {when(params.expiryTimestamp)}
              </span>
            </div>
          </div>
        </div>
        {account && (
          <button className="acct-option" onClick={onAccounts}>
            <Avatar seed={account.address} size={36} />
            <span className="grow">
              <strong>Share {account.label}</strong>
              <br />
              <small>{short(account.address, 10)}</small>
            </span>
            <span className="faint">Change in Accounts</span>
          </button>
        )}
        {isSanctioned(account?.address) && (
          <div className="callout amber" style={{ marginTop: 12 }}>
            This is the sanctioned account. The Relay doesn&apos;t screen approvals, so the
            connection goes through, but requests naming it will be withheld.
          </div>
        )}
        {state.error && (
          <div className="callout warn" id="proposal-error" style={{ marginTop: 12 }}>
            <strong>{state.blocked ? 'Blocked by the Relay' : 'Connection failed'}</strong>
            <div>
              {state.blocked
                ? "The Relay's policy doesn't allow Ember's project to connect with this dApp's project."
                : state.error}
            </div>
          </div>
        )}
        <div className="sheet-actions">
          <button
            className="btn secondary"
            id="reject"
            disabled={state.busy}
            onClick={() => (state.error ? onClose() : onAnswer(false))}
          >
            {state.error ? 'Close' : 'Cancel'}
          </button>
          <button
            className="btn grad"
            id="approve"
            disabled={state.busy || !!state.error}
            onClick={() => onAnswer(true)}
          >
            Connect
          </button>
        </div>
      </>
    )
  }
  return (
    <Sheet open={!!state} onClose={onClose}>
      {body}
    </Sheet>
  )
}
