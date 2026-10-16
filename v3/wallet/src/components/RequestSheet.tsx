import type { ReactNode } from 'react'

import { AppIcon, Avatar, Sheet, SheetHead } from '@/components/ui'
import { isSanctioned, same, SANCTIONED, short, TRANSFER, USDC } from '@/lib/common'

export interface Request {
  id: number
  topic: string
  chainId: string
  request: { method: string; params: any }
}

function decodeText(hex: string) {
  try {
    const bytes = new Uint8Array(
      hex
        .slice(2)
        .match(/../g)!
        .map(b => parseInt(b, 16))
    )
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return hex
  }
}

const ethOf = (weiHex?: string) => {
  const w = BigInt(weiHex || '0x0')
  const frac = (w % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return `${w / 10n ** 18n}.${frac || '0'}`
}

/** What a request asks for, in the terms a person approves. */
export function describe(r: Request): {
  kind: string
  account?: string
  glyph: string
  summary: string
  body: ReactNode
} {
  const { method, params } = r.request
  if (method === 'personal_sign') {
    const text = decodeText(params[0])
    return {
      kind: 'Signature request',
      account: params[1],
      glyph: '✍️',
      summary: text.slice(0, 60),
      body: (
        <>
          <div className="msg-box" id="message">
            {text}
          </div>
          {text.toLowerCase().includes(SANCTIONED.toLowerCase()) && (
            <div className="callout warn">
              This message names a sanctioned address. The Relay didn&apos;t stop it: it was
              hex-encoded.
            </div>
          )}
        </>
      )
    }
  }
  if (method === 'eth_sendTransaction') {
    const tx = params[0] ?? {}
    const isTransfer = same(tx.to, USDC) && (tx.data ?? '').startsWith(TRANSFER)
    const recipient: string = isTransfer ? `0x${tx.data.slice(34, 74)}` : tx.to
    const amount = isTransfer
      ? `${Number(BigInt(`0x${tx.data.slice(74)}`)) / 1e6} USDC`
      : `${ethOf(tx.value)} ETH`
    const risky = isSanctioned(recipient)
    return {
      kind: 'Transaction request',
      account: tx.from,
      glyph: isTransfer ? '$' : 'Ξ',
      summary: `${amount} to ${short(recipient ?? '')}`,
      body: (
        <>
          <div className="req-hero" style={{ padding: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{amount}</div>
          </div>
          <div className="tx-rows">
            <div>
              <span>To</span>
              <span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                <Avatar seed={recipient ?? ''} size={16} />
                {short(recipient ?? '?')}
                {risky && <span className="badge warn">sanctioned</span>}
              </span>
            </div>
            {isTransfer && (
              <div>
                <span>Token contract</span>
                <span>USDC · {short(USDC)}</span>
              </div>
            )}
            <div>
              <span>Network</span>
              <span>{r.chainId}</span>
            </div>
            <div>
              <span>From</span>
              <span>{short(tx.from ?? '?')}</span>
            </div>
          </div>
          {risky && (
            <div className="callout warn">
              {isTransfer
                ? "The recipient is sanctioned. The Relay didn't stop this: the address sits inside the token calldata."
                : 'The recipient is sanctioned.'}
            </div>
          )}
          <p className="faint" style={{ fontSize: 12.5, textAlign: 'center' }}>
            Demo: Ember simulates the transaction and doesn&apos;t broadcast it.
          </p>
        </>
      )
    }
  }
  return {
    kind: 'Request',
    glyph: '•',
    summary: method,
    body: <pre className="msg-box">{JSON.stringify(params, null, 2)}</pre>
  }
}

export function RequestSheet({
  open,
  request,
  peer,
  pending,
  canSign,
  onAnswer
}: {
  open: boolean
  request?: Request
  peer?: { name: string; url?: string; icons?: string[] }
  pending: number
  canSign: (address?: string) => boolean
  onAnswer: (approve: boolean) => void
}) {
  if (!request) return <Sheet open={false}>{null}</Sheet>
  const d = describe(request)
  const watchOnly = !!d.account && !canSign(d.account)
  return (
    <Sheet open={open}>
      <SheetHead
        title={d.kind}
        aside={
          <span className="badge neutral">{pending > 1 ? `1 of ${pending}` : request.chainId}</span>
        }
      />
      <div className="req-hero" style={{ marginBottom: 14 }}>
        <AppIcon src={peer?.icons?.[0]} size={48} name={peer?.name} />
        <span className="from">
          {peer?.name ?? 'dApp'} · {peer?.url ?? ''}
        </span>
      </div>
      <div className="stack">{d.body}</div>
      {watchOnly && (
        <div className="callout amber" style={{ marginTop: 12 }}>
          Ember holds no key for this account, so it can only decline.
        </div>
      )}
      <div className="sheet-actions">
        <button className="btn secondary" id="decline" onClick={() => onAnswer(false)}>
          Decline
        </button>
        <button
          className="btn grad"
          id="confirm"
          disabled={watchOnly}
          onClick={() => onAnswer(true)}
        >
          {request.request.method === 'personal_sign' ? 'Sign' : 'Confirm'}
        </button>
      </div>
    </Sheet>
  )
}
