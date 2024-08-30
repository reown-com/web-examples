import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { GrantPermissionsReturnType } from 'viem/experimental';
import { createGame } from '@/utils/TicTacToeUtils';

export async function POST(request: Request) {
  try {
    const { permissions, pci } = await request.json();

    if (!permissions) throw new Error('No permissions provided');
    if (!pci) throw new Error('No pci provided');

    const playerOAddress = (permissions as GrantPermissionsReturnType).signerData?.submitToAddress;
    if (!playerOAddress || !isAddress(playerOAddress)) throw new Error('Invalid playerO address');

    const txHash = await createGame(playerOAddress);

    return NextResponse.json({transactionHash : txHash});
  } catch (e) {
    console.error('Error:', e);
    return NextResponse.json(
      { message: 'An error occurred', error: (e as Error).message },
      { status: 500 }
    );
  }
}
