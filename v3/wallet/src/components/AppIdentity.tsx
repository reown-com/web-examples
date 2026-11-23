import { AppIcon } from '@/components/ui'

/**
 * Verify v4's context for one proposal or request, as the SDK derives it from the app's signature
 * and the Relay's `appMetadata`. Newer than the SDK's published types, so declared here.
 */
export interface V4Context {
  state: 'default' | 'domain_validated' | 'business_name' | 'verified' | 'invalid'
  origin?: string
  name?: string
  icon?: string
  isScam?: boolean
  isSimilarTo?: string
}

/** The Verify v4 context in an event's `verifyContext`, or "default" from an older SDK. */
export const v4Of = (verifyContext: unknown): V4Context =>
  (verifyContext as { v4?: V4Context } | undefined)?.v4 ?? { state: 'default' }

const hostOf = (origin?: string) => {
  try {
    return origin ? new URL(origin).host : ''
  } catch {
    return origin ?? ''
  }
}

const BADGE: Record<V4Context['state'], [string, string]> = {
  verified: ['✓ Verified', 'ok'],
  business_name: ['Business', 'ok'],
  domain_validated: ['Domain', 'neutral'],
  default: ['Unverified', 'amber'],
  invalid: ['Invalid signature', 'warn']
}

/**
 * Who the app is, as far as the Relay vouches for it. Never from the app's own metadata: an
 * unsigned app is just "Unverified app".
 * - default: unsigned, nothing known;
 * - domain_validated: only the domain;
 * - business_name: name, icon and domain;
 * - verified: name, icon and domain, with the verified badge;
 * - invalid: signed, but not this request.
 */
export function AppIdentity({ ctx, size = 64 }: { ctx: V4Context; size?: number }) {
  const host = hostOf(ctx.origin)
  const [badge, tone] = BADGE[ctx.state] ?? BADGE.default
  const named = ctx.state === 'business_name' || ctx.state === 'verified'
  const title =
    ctx.state === 'invalid'
      ? 'Signature mismatch'
      : named
        ? ctx.name || host
        : ctx.state === 'domain_validated'
          ? host
          : 'Unverified app'
  return (
    <div className="stack" style={{ gap: 10, alignItems: 'center' }} id="app-identity">
      {named ? (
        <AppIcon src={ctx.icon} size={size} name={ctx.name || host} />
      ) : (
        <span className="app-icon placeholder" style={{ width: size, height: size }}>
          {ctx.state === 'invalid' ? '!' : ctx.state === 'domain_validated' ? '🌐' : '?'}
        </span>
      )}
      <h3 style={{ margin: 0 }}>{title}</h3>
      {named && host && <span className="from">{host}</span>}
      <span className={`badge ${tone}`} id="verify-state" data-state={ctx.state}>
        {badge}
      </span>
      {ctx.state === 'default' && (
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          This app didn&apos;t sign the request, so nothing confirms who sent it.
        </p>
      )}
      {ctx.state === 'invalid' && (
        <div className="callout warn">
          The app&apos;s signature is for a different request. Something changed this one on the
          way: don&apos;t approve it.
        </div>
      )}
      {ctx.isScam && (
        <div className="callout warn">
          <strong>Known scam.</strong> The Relay flags this app as malicious.
        </div>
      )}
      {ctx.isSimilarTo && (
        <div className="callout amber">
          This app looks similar to <strong>{ctx.isSimilarTo}</strong>. Check the address.
        </div>
      )}
    </div>
  )
}
