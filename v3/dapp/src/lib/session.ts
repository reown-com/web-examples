// Server only. Nimbus's own sign-in session: the signing backend signs nothing without one.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * A demo sign-in: no password, anyone can be "demo". It stands in for the app's real login. What
 * matters is where the session lives: an HttpOnly, SameSite=Strict cookie the backend issued, so a
 * script on another site can't use it, and a script with no browser has none.
 *
 * The cookie is `<base64url claims>.<HMAC>`, stateless, so every API route checks it alike.
 */
export const COOKIE = 'nimbus_session'
const MAX_AGE_S = 8 * 60 * 60

export interface Session {
  user: string
  exp: number
}

const b64u = (b: Buffer) => b.toString('base64url')

// NIMBUS_SESSION_SECRET, else one derived from the signing key, else one per server process.
function secret(): Buffer {
  const set = process.env.NIMBUS_SESSION_SECRET || process.env.APP_SIGNATURE_PRIVATE_JWK
  if (set) return createHash('sha256').update(`nimbus-session:${set}`).digest()
  const g = globalThis as { __nimbusSessionSecret?: Buffer }
  return (g.__nimbusSessionSecret ??= randomBytes(32))
}

const mac = (payload: string) => createHmac('sha256', secret()).update(payload).digest()

function cookies(req: NextApiRequest): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

/** The request's session, if its cookie is ours and unexpired. */
export function sessionOf(req: NextApiRequest): Session | undefined {
  const raw = cookies(req)[COOKIE]
  if (!raw) return
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return
  const want = mac(payload)
  const got = Buffer.from(sig, 'base64url')
  if (got.length !== want.length || !timingSafeEqual(got, want)) return
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session
    if (typeof s.user !== 'string' || typeof s.exp !== 'number') return
    if (s.exp <= Math.floor(Date.now() / 1000)) return
    return s
  } catch {
    return
  }
}

const secure = (req: NextApiRequest) => req.headers['x-forwarded-proto'] === 'https'

function setCookie(req: NextApiRequest, res: NextApiResponse, value: string, maxAge: number) {
  res.setHeader(
    'set-cookie',
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`
  )
}

export function startSession(req: NextApiRequest, res: NextApiResponse, user: string): Session {
  const session = { user, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S }
  const payload = b64u(Buffer.from(JSON.stringify(session)))
  setCookie(req, res, `${payload}.${b64u(mac(payload))}`, MAX_AGE_S)
  return session
}

export const endSession = (req: NextApiRequest, res: NextApiResponse) => setCookie(req, res, '', 0)

/**
 * A browser's cross-origin call: its Origin names another host. Calls without an Origin (scripts)
 * pass this check, but they carry no session cookie.
 */
export function crossOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    return new URL(origin).host.toLowerCase() !== (req.headers.host ?? '').toLowerCase()
  } catch {
    return true
  }
}
