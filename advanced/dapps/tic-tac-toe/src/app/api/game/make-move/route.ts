/* eslint-disable no-console */
import { ticTacToeAbi } from '@/utils/abi'
import { executeActionsWithECDSAAndCosignerPermissions } from '@/utils/ERC7715PermissionsAsyncUtils'
import { TIC_TAC_TOE_PRIVATE_KEY } from '@/utils/SingletonUtils'
import { ticTacToeAddress } from '@/utils/TicTacToeUtils'
import { CoSignerApiError } from '@/utils/WalletConnectCosigner'
import { NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const account = privateKeyToAccount(TIC_TAC_TOE_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('', {
    timeout: 10000
  })
})

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http()
})

export async function POST(request: Request) {
  const { gameId, position, permissions, pci } = await request.json()

  try {
    if (typeof gameId !== 'string') {
      return NextResponse.json({ message: 'Invalid game ID' }, { status: 400 })
    }

    if (typeof position !== 'number' || position < 0 || position > 8) {
      return NextResponse.json({ message: 'Invalid position' }, { status: 400 })
    }

    const gameIdBigInt = BigInt(gameId)

    const makeMoveCallData = encodeFunctionData({
      abi: ticTacToeAbi,
      functionName: 'makeMove',
      args: [gameIdBigInt, position]
    })
    const makeMoveCallDataExecution = [
      {
        target: ticTacToeAddress,
        value: parseEther('0'),
        callData: makeMoveCallData
      }
    ]
    const userTxHash = await executeActionsWithECDSAAndCosignerPermissions({
      ecdsaPrivateKey: TIC_TAC_TOE_PRIVATE_KEY,
      pci,
      permissions,
      chain: sepolia,
      actions: makeMoveCallDataExecution
    })

    // Wait for the transaction receipt to get the event data
    await publicClient.waitForTransactionReceipt({
      hash: userTxHash
    })
    console.log('User move made successfully')

    // After the user's move, read the updated board state
    const updatedBoard = await publicClient.readContract({
      address: ticTacToeAddress,
      abi: ticTacToeAbi,
      functionName: 'getBoard',
      args: [gameIdBigInt]
    })
    console.log('Updated board:', updatedBoard)

    // Check for a winner after the user's move
    const winnerInfo = checkWinner([...updatedBoard])
    let winner = winnerInfo.winner
    let winningLine = winnerInfo.winningLine
    console.log('Winner:', winner)

    // If there's no winner, let the computer make its move
    let computerPosition: number | null = null
    if (!winner) {
      for (let i = 0; i < updatedBoard.length; i += 1) {
        if (updatedBoard[i] === 0) {
          // Assuming 0 means empty
          computerPosition = i
          break
        }
      }

      if (computerPosition !== null) {
        // Make the computer's move
        const computerTxHash = await walletClient.writeContract({
          address: ticTacToeAddress,
          abi: ticTacToeAbi,
          functionName: 'makeMove',
          args: [gameIdBigInt, computerPosition]
        })
        console.log('Computer move made successfully')

        // Wait for the transaction receipt to get the event data
        await publicClient.waitForTransactionReceipt({
          hash: computerTxHash
        })

        // Read the updated board state again
        const finalBoard = await publicClient.readContract({
          address: ticTacToeAddress,
          abi: ticTacToeAbi,
          functionName: 'getBoard',
          args: [gameIdBigInt]
        })
        console.log('Final board:', finalBoard)

        // Check for a winner after the computer's move
        const finalWinnerInfo = checkWinner([...finalBoard])
        winner = finalWinnerInfo.winner
        winningLine = finalWinnerInfo.winningLine

        return NextResponse.json({
          message: 'Moves made successfully',
          transactionHashes: {
            userMove: userTxHash,
            computerMove: computerTxHash
          },
          gameState: {
            board: transformBoard([...finalBoard]),
            isXNext: true,
            winner,
            winningLine,
            gameId
          }
        })
      }

      return NextResponse.json({ message: 'No available moves for the computer' }, { status: 400 })
    }

    return NextResponse.json({
      message: 'User move made successfully',
      transactionHashes: {
        userMove: userTxHash
      },
      gameState: {
        board: transformBoard([...updatedBoard]),
        isXNext: true,
        winner,
        winningLine,
        gameId
      }
    })
  } catch (e) {
    console.log('Error interacting with contract:', e)
    let errorMessage = 'Error making move'
    if (e instanceof CoSignerApiError) {
      errorMessage = e.message
    } else if (typeof e === 'string') {
      errorMessage = e
    } else {
      try {
        errorMessage = JSON.stringify(e, null, 2)
      } catch (jsonError) {
        errorMessage = Object.prototype.toString.call(e)
      }
    }
    console.log('Error message:', errorMessage)

    return NextResponse.json({ message: errorMessage, error: errorMessage }, { status: 500 })
  }
}

function transformBoard(board: number[]): string[] {
  return board.map(cell => {
    if (cell === 1) {
      return 'X'
    }
    if (cell === 2) {
      return 'O'
    }

    return ''
  })
}

function checkWinner(board: number[]): { winner: string | null; winningLine: number[] | null } {
  const winningPositions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ]

  for (const positions of winningPositions) {
    const [a, b, c] = positions
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] === 1 ? 'X' : 'O', winningLine: positions }
    }
  }

  return { winner: null, winningLine: null }
}
