import { NextResponse } from 'next/server';
import {  getBoardState } from '@/utils/TicTacToeUtils';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const gameId = url.searchParams.get('gameId');
    if (!gameId) throw new Error('Invalid game ID');

    const board = await getBoardState(gameId);

    const gameState = { board, isXNext: true, winner: null, winningLine: null, gameId };
    return NextResponse.json(gameState);
  } catch (e) {
    console.error('Error:', e);
    return NextResponse.json(
      { message: 'An error occurred', error: (e as Error).message },
      { status: 500 }
    );
  }
}