#!/usr/bin/env node

/**
 * SEP-53 message-signing test vectors.
 *
 * The signatures below come from the finalized SEP-53 spec
 * (stellar/stellar-protocol, ecosystem/sep-0053.md), NOT from our own signer, so
 * they pin the algorithm independently:
 *
 *   sign(Ed25519, sha256("Stellar Signed Message:\n" || message))
 *
 * The prefix is concatenated directly with the message bytes (no separator byte).
 * `signMessage` here mirrors `StellarLib.signMessage` (src/lib/StellarLib.ts) and
 * the dApp verifier (react-dapp-v2 JsonRpcContext); if either drifts from this
 * algorithm it stops matching the spec vectors.
 */

const assert = require('node:assert/strict')

const { Keypair, hash } = require('@stellar/stellar-base')

const SEED = 'SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW'
const ADDRESS = 'GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L'
const SEP53_PREFIX = Buffer.from('Stellar Signed Message:\n', 'utf-8')

// [message, expected base64 signature]. A Buffer message is signed as raw bytes.
const VECTORS = [
  [
    'Hello, World!',
    'fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA=='
  ],
  [
    'こんにちは、世界！',
    'CDU265Xs8y3OWbB/56H9jPgUss5G9A0qFuTqH2zs2YDgTm+++dIfmAEceFqB7bhfN3am59lCtDXrCtwH2k1GBA=='
  ],
  [
    Buffer.from('2zZDP1sa1BVBfLP7TeeMk3sUbaxAkUhBhDiNdrksaFo=', 'base64'),
    'VA1+7hefNwv2NKScH6n+Sljj15kLAge+M2wE7fzFOf+L0MMbssA1mwfJZRyyrhBORQRle10X1Dxpx+UOI4EbDQ=='
  ]
]

function signMessage(keypair, message) {
  const messageBytes = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf-8')
  const payload = hash(Buffer.concat([SEP53_PREFIX, messageBytes]))

  return keypair.sign(payload).toString('base64')
}

const keypair = Keypair.fromSecret(SEED)
assert.equal(keypair.publicKey(), ADDRESS, 'seed should derive the fixture address')

for (const [message, expected] of VECTORS) {
  const label = Buffer.isBuffer(message) ? `binary(${message.toString('base64')})` : JSON.stringify(message)

  assert.equal(signMessage(keypair, message), expected, `SEP-53 signature mismatch for ${label}`)
}

console.log(`SEP-53 message signing: ${VECTORS.length} spec vectors passed`)
