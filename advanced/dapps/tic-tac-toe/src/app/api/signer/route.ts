import { NextResponse } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'

export function GET() {
  try {
    const TIC_TAC_TOE_PRIVATE_KEY = process.env.NEXT_PUBLIC_TIC_TAC_TOE_PRIVATE_KEY as `0x${string}`
    const account = privateKeyToAccount(TIC_TAC_TOE_PRIVATE_KEY)

    return NextResponse.json({ key: account.publicKey })
  } catch (e) {
    console.warn('Error getting signer:', e)

    return NextResponse.json(
      { message: 'Error getting signer', error: (e as Error).message },
      { status: 500 }
    )
  }
}
