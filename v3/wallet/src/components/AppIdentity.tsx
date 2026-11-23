import { AppIcon } from '@/components/ui'

/**
 * Who sent a proposal or request, as the Relay vouches for it (Verify v4): the SDK's
 * `verification`. Every field comes from the Relay, never from the dApp's own metadata. Newer than
 * the SDK's published types, so declared here.
 */
export interface AppVerification {
  domain?: string
  name?: string
  icon?: string
  isVerified: boolean
  isScam: boolean
  isSimilarTo?: string
}

const UNVERIFIED: AppVerification = { isVerified: false, isScam: false }

/** An event's or session's `verification`. An SDK without Verify v4 has none: unverified. */
export const verificationOf = (from: unknown): AppVerification =>
  (from as { verification?: AppVerification } | undefined)?.verification ?? UNVERIFIED

/** What to call the app in one line: its reviewed name, else its domain. */
export const appLabel = (v: AppVerification) => v.name || v.domain || 'Unverified app'

/**
 * Renders whatever the verification has: the domain if there is one, the name and icon if there
 * are, a badge when verified, and warnings for scams and look-alikes. Nothing else identifies the
 * app.
 */
export function AppIdentity({
  verification: v,
  size = 64
}: {
  verification: AppVerification
  size?: number
}) {
  return (
    <div className="stack" style={{ gap: 10, alignItems: 'center' }} id="app-identity">
      {v.icon || v.name ? (
        <AppIcon src={v.icon} size={size} name={v.name || v.domain} />
      ) : (
        <span className="app-icon placeholder" style={{ width: size, height: size }}>
          {v.domain ? '🌐' : '?'}
        </span>
      )}
      <h3 style={{ margin: 0 }}>{appLabel(v)}</h3>
      {v.name && v.domain && <span className="from">{v.domain}</span>}
      {v.isVerified && (
        <span className="badge ok" id="verified-badge">
          ✓ Verified
        </span>
      )}
      {!v.domain && (
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          Nothing confirms who sent this: the app didn&apos;t sign it.
        </p>
      )}
      {v.isScam && (
        <div className="callout warn" id="scam-warning">
          <strong>Known scam.</strong> The Relay flags this app as malicious.
        </div>
      )}
      {v.isSimilarTo && (
        <div className="callout amber" id="similar-warning">
          This app looks like <strong>{v.isSimilarTo}</strong>, but isn&apos;t it. Check the
          address.
        </div>
      )}
    </div>
  )
}
