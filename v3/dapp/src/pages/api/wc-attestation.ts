import { createHash, webcrypto } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

import { DENYLISTED } from '@/lib/common'

/**
 * Verify v4's App Signature backend: signs one Sign v3 message for Nimbus, or refuses to.
 *
 * POST { requestJson, ciphertextHash? } → { appSignature } or 403 { error }
 *
 * The JWT is ES256 with the key in APP_SIGNATURE_PRIVATE_JWK (`node scripts/app-signature-keys.mjs`):
 * - `iss`: this app's host, APP_SIGNATURE_DOMAIN or the request's Host;
 * - `sub`: base64url SHA-256 of `requestJson`'s UTF-8 bytes, exactly the plaintext the SDK sends;
 * - `cth`: the SDK's hash of the sealed payload, for sealed messages;
 * - `exp`: 5 minutes.
 * The Relay checks it against the keys the domain published; the wallet checks `sub`.
 */

const b64u = (b: Uint8Array | Buffer) => Buffer.from(b).toString('base64url')

const DENYLIST = (process.env.APP_SIGNATURE_DENYLIST || DENYLISTED)
  .split(',')
  .map(a => a.trim().toLowerCase())

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

/** The policy: refuse ETH sent to a denylisted address. Everything else is signed. */
function refusal(rpc: any): string | undefined {
  if (rpc?.method !== 'wc_sessionRequest') return
  const { method, params } = rpc.params?.request ?? {}
  if (method !== 'eth_sendTransaction') return
  const to = String(params?.[0]?.to ?? '').toLowerCase()
  if (DENYLIST.includes(to)) return `eth_sendTransaction to ${to} is denylisted`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { requestJson, ciphertextHash } = req.body ?? {}
  if (typeof requestJson !== 'string') return res.status(400).json({ error: 'requestJson' })
  let rpc: unknown
  try {
    rpc = JSON.parse(requestJson)
  } catch {
    return res.status(400).json({ error: 'requestJson is not JSON' })
  }
  const refused = refusal(rpc)
  if (refused) return res.status(403).json({ error: refused })

  let k
  try {
    k = await signingKey()
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
  // The Relay wants a bare lowercase hostname, and the browser's Origin host to match it.
  const iss = (
    process.env.APP_SIGNATURE_DOMAIN || (req.headers.host ?? '').replace(/:\d+$/, '')
  ).toLowerCase()
  const claims = {
    iss,
    sub: b64u(createHash('sha256').update(requestJson, 'utf8').digest()),
    ...(typeof ciphertextHash === 'string' ? { cth: ciphertextHash } : {}),
    exp: Math.floor(Date.now() / 1000) + 300
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
