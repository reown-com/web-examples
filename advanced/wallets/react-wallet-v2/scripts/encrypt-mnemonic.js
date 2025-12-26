#!/usr/bin/env node
/**
 * Simple XOR obfuscation for E2E testing
 * 
 * Usage:
 *   E2E_WALLET_MNEMONIC="word1 word2 ..." E2E_ENCRYPTION_KEY="secret" node scripts/encrypt-mnemonic.js
 * 
 * Output: Base64 encoded XOR'd string
 */

function encrypt(plaintext, key) {
  const textBytes = Buffer.from(plaintext, 'utf8')
  const keyBytes = Buffer.from(key)
  
  const encrypted = Buffer.alloc(textBytes.length)
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  
  return encrypted.toString('base64')
}

// Get inputs
const mnemonic = process.env.E2E_WALLET_MNEMONIC
const encryptionKey = process.env.E2E_ENCRYPTION_KEY

if (!mnemonic || !encryptionKey) {
  console.error('Usage: E2E_WALLET_MNEMONIC="..." E2E_ENCRYPTION_KEY="..." node encrypt-mnemonic.js')
  process.exit(1)
}

const encrypted = encrypt(mnemonic, encryptionKey)
console.log(encrypted)

