#!/usr/bin/env node

const assert = require('node:assert/strict')

const { Keypair } = require('@solana/web3.js')
const { mnemonicToSeedSync } = require('bip39')
const { derivePath } = require('ed25519-hd-key')

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const CASES = [
  {
    path: "m/44'/501'/0'/0'",
    address: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk'
  },
  {
    path: "m/44'/501'/1'/0'",
    address: 'Hh8QwFUA6MtVu1qAoq12ucvFHNwCcVTV7hpWjeY1Hztb'
  }
]

function deriveAddress(path) {
  const seed = mnemonicToSeedSync(MNEMONIC)
  const { key } = derivePath(path, seed.toString('hex'))

  return Keypair.fromSeed(key).publicKey.toBase58()
}

const addresses = CASES.map(({ path, address }) => {
  const first = deriveAddress(path)
  const second = deriveAddress(path)

  assert.equal(first, second, `${path} should be deterministic`)
  assert.equal(first, address, `${path} should match its fixture address`)

  return first
})

assert.notEqual(addresses[0], addresses[1], 'account indexes should derive distinct addresses')
