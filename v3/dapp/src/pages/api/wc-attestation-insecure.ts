import { createHash, webcrypto } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

/*
 * ⚠️  NEVER DO THIS. AN INSECURE SIGNING BACKEND, FOR THE VERIFY V4 POC'S EXPLOIT DEMO ONLY. ⚠️
 *
 * This is how NOT to write an App Signature backend. It signs whatever plaintext any caller sends,
 * from anywhere, with no policy at all: no denylist, no check of who is asking, CORS open to every
 * site. Anyone who can reach it gets the app's domain, and its Business verified name and
 * checkmark, on a request of their choosing, such as sending all of a user's ETH to themselves.
 * Verify v4 can't stop that: the Relay and the wallet only check that the app's key signed the
 * request, and here it signs everything.
 *
 * The real backend is `wc-attestation.ts`, which refuses ETH sent to a denylisted address.
 *
 * Off unless APP_SIGNATURE_INSECURE_DEMO=on, which only the local POC sets: otherwise 404. The
 * e2e test `v3/e2e/tests/exploits-succeed.spec.ts` uses it to show that the security boundary is
 * the app's own backend.
 */

const b64u = (b: Uint8Array | Buffer) => Buffer.from(b).toString('base64url')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.APP_SIGNATURE_INSECURE_DEMO !== 'on') return res.status(404).end()
  // ⚠️ NEVER DO THIS: any site may call it.
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { requestJson } = req.body ?? {}
  if (typeof requestJson !== 'string') return res.status(400).json({ error: 'requestJson' })
  const raw = process.env.APP_SIGNATURE_PRIVATE_JWK
  if (!raw) return res.status(500).json({ error: 'APP_SIGNATURE_PRIVATE_JWK is not set' })
  const jwk = JSON.parse(raw) as webcrypto.JsonWebKey & { kid?: string }
  const key = await webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  // ⚠️ NEVER DO THIS: no policy. Whatever the caller asks for is signed, as the app's domain.
  const claims = {
    iss: (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase(),
    sub: b64u(createHash('sha256').update(requestJson, 'utf8').digest()),
    exp: Math.floor(Date.now() / 1000) + 120
  }
  const header = { alg: 'ES256', typ: 'JWT', ...(jwk.kid ? { kid: jwk.kid } : {}) }
  const input = `${b64u(Buffer.from(JSON.stringify(header)))}.${b64u(Buffer.from(JSON.stringify(claims)))}`
  const sig = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    Buffer.from(input)
  )
  res.status(200).json({ appSignature: `${input}.${b64u(new Uint8Array(sig))}` })
}
