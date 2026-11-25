// Config and helpers shared by Nimbus and Ember. Each app keeps its own copy, so it deploys alone.

export const RELAY_URL =
  process.env.NEXT_PUBLIC_RELAY_URL || 'https://pool-1.dev-relay.walletconnect.com'
export const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || 'sign-v3-demo'

// The dev Relay's screening rules (rs-relay src/middleware/screening.rs).
export const SANCTIONED = '0xEe4AB1140F8f519F0De7FFf252Cf914Ee9154D2e'
export const POLICY_A = 'ccb3504a8edab30995573bd2d12490d2'
export const POLICY_B = '6c4987808a32c733009faf0d9b43a9af'
// Nimbus's own contracts (a demo vault): the signing backend (lib/policy.ts) signs value sent to
// these or to the connected account itself, and nowhere else.
export const NIMBUS_VAULT = '0x4e1b050000000000000000000000000000000001'
export const NIMBUS_CONTRACTS = (process.env.NEXT_PUBLIC_NIMBUS_CONTRACTS || NIMBUS_VAULT)
  .split(',')
  .map(a => a.trim().toLowerCase())
  .filter(Boolean)
// Verify v4: sign every request with the backend. Needs APP_SIGNATURE_PRIVATE_JWK on the server.
export const APP_SIGNATURE = process.env.NEXT_PUBLIC_APP_SIGNATURE === 'on'
// The hosts whose published keys include APP_SIGNATURE_PRIVATE_JWK's: on one of them the app signs
// as that host, on any other it sends unsigned. `*.example.com` matches any name under
// example.com. Empty: it signs as whatever host it is on.
export const APP_SIGNATURE_DOMAINS = (process.env.NEXT_PUBLIC_APP_SIGNATURE_DOMAINS || '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean)
/** Whether the app signs on `host` (a bare hostname, no port). */
export const signsFor = (host: string) => {
  const h = host.toLowerCase()
  return (
    APP_SIGNATURE_DOMAINS.length === 0 ||
    APP_SIGNATURE_DOMAINS.some(d => (d.startsWith('*.') ? h.endsWith(d.slice(1)) : d === h))
  )
}
export const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
export const TRANSFER = '0xa9059cbb'

export const PROJECTS = [
  { id: DEFAULT_PROJECT_ID, label: 'Demo project' },
  { id: POLICY_A, label: 'Policy project A' },
  { id: POLICY_B, label: 'Policy project B' }
]

// v2's SDK errors, as @walletconnect/utils getSdkError returns them.
export const USER_REJECTED = { code: 5000, message: 'User rejected.' }
export const USER_DISCONNECTED = { code: 6000, message: 'User disconnected.' }
export const UNSUPPORTED_METHOD = { code: 5101, message: 'Unsupported methods.' }

// v2's events, for the developer log.
export const EVENTS = [
  'session_proposal',
  'session_connect',
  'session_request',
  'session_event',
  'session_update',
  'session_extend',
  'session_ping',
  'session_delete',
  'session_expire'
] as const

export const short = (s: string, n = 6) =>
  s && s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-4)}` : s
export const when = (unixS: number) =>
  new Date(unixS * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
export const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
export const isSanctioned = (a?: string) => same(a, SANCTIONED)

/** What an error means to someone using the app. */
export function explain(e: unknown): string {
  const err = e as { code?: unknown; message?: string }
  if (err?.code === 6) return 'No answer in time. The Relay may have withheld the request.'
  const m = err?.message ?? String(e)
  if (/\bblocked\b/.test(m)) return "Blocked by the Relay's policy for these two projects."
  // Verify v4: the SDK's AppSignatureRefusedError
  // Nimbus's own backend, before anything was sent (lib/client.ts).
  const refused = /Nimbus's backend refused to sign: (.*)$/s.exec(m)
  if (refused) return `Nimbus's backend refused to sign this: ${refused[1]}. Nothing was sent.`
  if (/\bapp_signature_required\b/.test(m))
    return "Refused by the Relay: this domain requires App Signatures, and this request wasn't signed."
  if (/\binvalid_app_signature\b/.test(m))
    return "Refused by the Relay: this request's App Signature doesn't check out."
  if (/message_expired/.test(m))
    return 'No answer in time. The Relay may have withheld the request.'
  if (/request_resolved/.test(m)) return 'This request was already answered or has expired.'
  if (/not_found/.test(m)) return 'Not found. The request was replaced or has expired.'
  if (/invalid_uri/.test(m)) return "That isn't a valid wc: URI."
  if (/connection_closed/.test(m)) return 'The connection was closed.'
  return m
}
