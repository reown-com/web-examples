/* eslint-disable max-depth */
/* eslint-disable no-negated-condition */
import { ticTacToeAbi } from '@/utils/abi'
import { getBlockchainApiRpcUrl, TIC_TAC_TOE_PRIVATE_KEY } from '@/utils/SingletonUtils'
import { ticTacToeAddress } from '@/utils/TicTacToeUtils'
import { NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, decodeEventLog, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { GrantPermissionsReturnType } from 'viem/experimental'

const account = privateKeyToAccount(TIC_TAC_TOE_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(
    getBlockchainApiRpcUrl({
      chain: sepolia,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!
    }),
    {
      timeout: 10000
    }
  )
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

export async function POST(request: Request) {
  const { permissions, pci } = await request.json()

  try {
    if (permissions && pci) {
      const playerOAddress = (permissions as GrantPermissionsReturnType).signerData?.submitToAddress

      if (!playerOAddress || !isAddress(playerOAddress)) {
        return NextResponse.json({ message: 'Invalid playerO address' }, { status: 400 })
      }

      const txHash = await walletClient.writeContract({
        address: ticTacToeAddress,
        abi: ticTacToeAbi,
        functionName: 'createGame',
        args: [playerOAddress]
      })
      // Wait for the transaction receipt to get the event data
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash
      })

      const gameCreatedEvent = receipt.logs

      if (!gameCreatedEvent) {
        return NextResponse.json(
          { message: 'Failed to retrieve game ID from event' },
          { status: 500 }
        )
      }

      const decodedGameId = decodeEventLog({
        abi: ticTacToeAbi,
        eventName: 'GameCreated',
        topics: gameCreatedEvent[0].topics
      }).args.gameId

      const initialGameState = {
        board: Array(9).fill(null),
        isXNext: true,
        winner: null,
        winningLine: null,
        gameId: decodedGameId.toString()
      }

      return NextResponse.json({ ...initialGameState, transactionHash: txHash })
    }
  } catch (e) {
    console.warn('Error interacting with contract:', e)

    return NextResponse.json(
      { message: 'Error interacting with contract', error: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const gameId = url.searchParams.get('gameId')

  if (!gameId) {
    return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 })
  }

  try {
    const gameIdBigInt = BigInt(gameId)
    const board = await publicClient.readContract({
      address: ticTacToeAddress,
      abi: ticTacToeAbi,
      functionName: 'getBoard',
      args: [gameIdBigInt]
    })

    const gameState = {
      board,
      isXNext: true,
      winner: null,
      winningLine: null,
      gameId
    }

    return NextResponse.json(gameState)
  } catch (e) {
    console.warn('Error getting board:', e)

    return NextResponse.json(
      { message: 'Error getting board', error: (e as Error).message },
      { status: 500 }
    )
  }
}
