import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple XOR-based obfuscation for E2E testing
 * Not cryptographically secure - just prevents casual exposure in logs
 */
function decrypt(encryptedData: string, key: string): string {
  const encrypted = Buffer.from(encryptedData, 'base64')
  const keyBytes = Buffer.from(key)

  const decrypted = Buffer.alloc(encrypted.length)
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
  }

  return decrypted.toString('utf8')
}

export async function GET(request: NextRequest) {
  const encryptionKey = process.env.E2E_ENCRYPTION_KEY

  if (!encryptionKey) {
    return NextResponse.json(
      { error: 'E2E not configured - missing E2E_ENCRYPTION_KEY env var' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const encrypted = searchParams.get('data')

  if (!encrypted) {
    return NextResponse.json({ error: 'Missing encrypted data' }, { status: 400 })
  }

  try {
    // Fix URL encoding: spaces should be '+' in base64, and decode URI components
    let decoded = decodeURIComponent(encrypted)
    decoded = decoded.replace(/ /g, '+')

    const mnemonic = decrypt(decoded, encryptionKey)

    return NextResponse.json({ mnemonic })
  } catch (error) {
    return NextResponse.json({ error: `Decryption failed: ${error}` }, { status: 400 })
  }
}
