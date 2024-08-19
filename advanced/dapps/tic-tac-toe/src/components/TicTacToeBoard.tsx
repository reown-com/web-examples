/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use client'

import { GameState, useTicTacToeContext } from '@/context/TicTacToeContextProvider'
import { useTicTacToeActions } from '@/hooks/useTicTacToeActions'
import React from 'react'
import { CircleIcon, Cross1Icon } from '@radix-ui/react-icons'

function TicTacToeBoard() {
  const { gameState, gameStarted, loading } = useTicTacToeContext()
  const { handleMove } = useTicTacToeActions()

  if (!gameState?.gameId) {
    console.warn('Game ID not found')

    return <p>Game not started. Please start a new game.</p>
  }

  const xCount = gameState.board.filter(cell => cell === 'X').length
  const oCount = gameState.board.filter(cell => cell === 'O').length

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center">
        {gameState.winner ? (
          <h2 className="text-xl sm:text-2xl text-center bg-green-100 text-green-700 p-4">
            Winner: {gameState.winner}
          </h2>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="text-md sm:text-xl text-center">Game ID: {gameState.gameId}</h2>
            <h2 className="text-md sm:text-xl text-center">
              {gameState.isXNext ? 'Your Turn' : 'System Turn'}
            </h2>
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
        {/* Player (You) */}
        <div className="flex items-center flex-col justify-center">
          <div className="flex items-center">
            <div
              className="w-20 h-20 bg-green-500 flex items-center justify-center transform rotate-30"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            >
              <Cross1Icon width={40} height={40} color="white" />
            </div>
          </div>
          <div className="flex items-center  mt-2 ">
            <p className="text-white font-semiboldtext-center">You :</p>
            <span className="text-white font-bold text-lg sm:text-xl ml-2 text-center">
              {xCount}
            </span>
          </div>
        </div>

        {/* Game Board */}
        <div
          className={`grid grid-cols-3 gap-2 sm:gap-4 ${
            !gameStarted && 'hover:cursor-not-allowed'
          }`}
        >
          {Array(9)
            .fill(null)
            .map((_, index) => (
              <Square
                key={index}
                gameState={gameState}
                index={index}
                handleMove={handleMove}
                loading={loading}
              />
            ))}
        </div>

        {/* System (Opponent) */}
        <div className="flex items-center flex-col justify-center">
          <div className="flex items-center">
            <div
              className="w-20 h-20 bg-red-500 flex items-center justify-center transform rotate-30"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            >
              <CircleIcon width={40} height={40} color="white" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <p className="text-white font-semibold text-center">System :</p>

            <span className="text-white font-bold text-lg sm:text-xl ml-2 text-center">
              {oCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Square({
  gameState,
  index,
  handleMove,
  loading
}: {
  gameState: GameState
  index: number
  handleMove: (gameId: string, position: number) => void
  loading: boolean
}) {
  const isWinningSquare = gameState.winningLine?.includes(index)

  return (
    <button
      className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-xl sm:text-2xl md:text-3xl font-bold border-2 flex items-center justify-center ${
        isWinningSquare ? 'bg-yellow-50' : 'border-gray-300'
      } hover:cursor-pointer`}
      onClick={() => handleMove(gameState.gameId!, index)}
      disabled={loading}
    >
      {!gameState.board[index] && index}
      {gameState.board[index] === 'X' && <Cross1Icon width={40} height={40} color="green" />}
      {gameState.board[index] === 'O' && <CircleIcon width={40} height={40} color="red" />}
    </button>
  )
}

export default TicTacToeBoard
