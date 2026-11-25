#!/usr/bin/env node
// Makes an ES256 key pair for Verify v4 App Signatures and prints what goes where:
//   node scripts/app-signature-keys.mjs [host]      host defaults to localhost
// 1. APP_SIGNATURE_PRIVATE_JWK, for the app's server (.env.local);
// 2. wc-domain-verify.json, which the domain publishes at /.well-known/wc-domain-verify.json;
// 3. RELAY_VERIFY_V4_DOMAINS, the Relay's static registry entry for the domain.
import { createHash, webcrypto } from 'node:crypto'

const host = (process.argv[2] || 'localhost').toLowerCase()
const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
)
const priv = await webcrypto.subtle.exportKey('jwk', privateKey)
const { kty, crv, x, y } = await webcrypto.subtle.exportKey('jwk', publicKey)
// RFC 7638 thumbprint: the required members, in lexicographic order.
const kid = createHash('sha256')
  .update(JSON.stringify({ crv, kty, x, y }))
  .digest('base64url')
const pub = { kty, crv, x, y, kid, alg: 'ES256', use: 'sig' }
const privJwk = { kty, crv, x, y, d: priv.d, kid, alg: 'ES256', use: 'sig' }

const registry = [
  {
    domain: host,
    status: 'verified',
    keys: [{ kid, jwk: pub, validFrom: 0 }],
    requireSignatures: false,
    tier: 'domain_verified',
    name: null,
    icon: null
  }
]

console.log(`# 1. App server, in v3/dapp/.env.local (keep it secret)
NEXT_PUBLIC_APP_SIGNATURE=on
NEXT_PUBLIC_APP_SIGNATURE_DOMAINS=${host}
APP_SIGNATURE_PRIVATE_JWK='${JSON.stringify(privJwk)}'

# 2. Public: https://${host}/.well-known/wc-domain-verify.json
${JSON.stringify({ allowed_organizations: [], keys: [pub] }, null, 2)}

# 3. Relay, its static Verify v4 registry
RELAY_VERIFY_V4_DOMAINS='${JSON.stringify(registry)}'`)
