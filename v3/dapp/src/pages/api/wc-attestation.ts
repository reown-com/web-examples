import { createHash, webcrypto } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { signsFor } from '@/lib/common'
import { refusal } from '@/lib/policy'
import { crossOrigin, sessionOf } from '@/lib/session'

/**
 * Verify v4's App Signature backend: signs one message for Nimbus, or refuses to.
 *
 * POST { requestJson, cnx? } → { appSignature } or 401/403 { error }
 *
 * It signs intent, not requests:
 * - only for a signed-in Nimbus session (the HttpOnly, SameSite=Strict cookie from
 *   /api/nimbus-session). Without one it signs nothing, connections included: the frontend then
 *   sends unsigned, and the wallet shows no app identity;
 * - only what lib/policy.ts allows: a connection, a ping, or one of the wallet methods Nimbus asks
 *   for, with value going only to the account itself or to Nimbus's own contracts;
 * - only what it checked: the policy reads `requestJson` parsed, the exact string `sub` hashes,
 *   never a separately supplied object.
 *
 * The JWT is ES256 with the key in APP_SIGNATURE_PRIVATE_JWK (`node scripts/app-signature-keys.mjs`):
 * - `iss`: the request's Host, if NEXT_PUBLIC_APP_SIGNATURE_DOMAINS lists it (or the list is empty);
 *   the browser's Origin must match it. Any other host is refused: its key isn't this one;
 * - `sub`: base64url SHA-256 of `requestJson`'s UTF-8 bytes, exactly the plaintext the SDK sends,
 *   on Sign v2 too;
 * - `cnx`: copied verbatim when the SDK passes it (Sign v3): the connectionId, or the proposal's
 *   bindingPub. The Relay refuses a Sign v3 signature without the connection's `cnx`, so one
 *   signature can't be replayed on another connection;
 * - `exp`: 2 minutes. The SDK asks again for a send retried after that; wallets never check it.
 * No claim covers the encrypted bytes: this backend couldn't check one, and the wallet's `sub`
 * check binds the JWT to the content. The Relay checks the JWT against the keys the domain
 * published; the wallet checks `sub`.
 */

const b64u = (b: Uint8Array | Buffer) => Buffer.from(b).toString('base64url')

let key: Promise<{ kid?: string; key: webcrypto.CryptoKey }> | undefined

function signingKey() {
  const raw = process.env.APP_SIGNATURE_PRIVATE_JWK
  if (!raw) throw new Error('APP_SIGNATURE_PRIVATE_JWK is not set')
  key ??= (async () => {
    const jwk = JSON.parse(raw) as webcrypto.JsonWebKey & { kid?: string }
    return {
      kid: jwk.kid,
      key: await webcrypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      )
    }
  })()
  return key
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (crossOrigin(req)) return res.status(403).json({ error: 'cross-origin calls are refused' })
  if (!sessionOf(req)) return res.status(401).json({ error: 'not signed in to Nimbus' })
  const { requestJson, cnx } = req.body ?? {}
  if (typeof requestJson !== 'string') return res.status(400).json({ error: 'requestJson' })
  if (cnx !== undefined && (typeof cnx !== 'string' || !cnx))
    return res.status(400).json({ error: 'cnx must be a non-empty string' })
  // The policy reads the very string `sub` hashes.
  let rpc: unknown
  try {
    rpc = JSON.parse(requestJson)
  } catch {
    return res.status(400).json({ error: 'requestJson is not JSON' })
  }
  const refused = refusal(rpc)
  if (refused) return res.status(403).json({ error: refused })
  // The Relay wants a bare lowercase hostname, and the browser's Origin host to match it.
  const iss = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase()
  if (!iss || !signsFor(iss))
    return res.status(403).json({ error: `this key isn't published for ${iss || 'this host'}` })

  let k
  try {
    k = await signingKey()
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
  const claims = {
    iss,
    sub: b64u(createHash('sha256').update(requestJson, 'utf8').digest()),
    ...(cnx ? { cnx } : {}),
    exp: Math.floor(Date.now() / 1000) + 120
  }
  const header = { alg: 'ES256', typ: 'JWT', ...(k.kid ? { kid: k.kid } : {}) }
  const input = `${b64u(Buffer.from(JSON.stringify(header)))}.${b64u(Buffer.from(JSON.stringify(claims)))}`
  // WebCrypto's ECDSA signature is r ‖ s, which is what JWS wants.
  const sig = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    k.key,
    Buffer.from(input)
  )
  res.status(200).json({ appSignature: `${input}.${b64u(new Uint8Array(sig))}` })
}
