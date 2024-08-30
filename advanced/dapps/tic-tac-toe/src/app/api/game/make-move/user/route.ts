
import {  makeUserMove } from '@/utils/TicTacToeUtils'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { gameId, position, permissions, pci, } = await request.json()

    if (typeof gameId !== 'string') {
      return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 })
    }
    if (typeof position !== 'number' || position < 0 || position > 8) {
      return NextResponse.json({ message: 'Invalid position' }, { status: 400 })
    }

    const userTxHash = await makeUserMove(gameId, position, permissions, pci)
    return NextResponse.json({userOpIdentifier : userTxHash});

  } catch (e) {
    console.error('Error:', e)
    const errorMessage = (e as Error)?.message || 'Error making move'
    return NextResponse.json({ message: 'Error making move', error: errorMessage }, { status: 500 })
  }
}
