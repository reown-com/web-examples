"use client";

import React, { useCallback, useState, memo } from "react";
import { useTicTacToeContext } from "@/context/TicTacToeContextProvider";
import { useTicTacToeActions } from "@/hooks/useTicTacToeActions";
import { CircleIcon, Cross1Icon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import {
  checkWinner,
  getBoardState,
  transformBoard,
} from "@/utils/TicTacToeUtils";
import { getCallsStatus } from "@/utils/UserOpBuilderServiceUtils";
import PositionSquare from "./PositionSquare";

// Memoized PlayerCard component with animated turn indicator
const PlayerCard = memo(
  ({
    icon,
    label,
    score,
    isActive,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    score: number;
    isActive: boolean;
    color: string;
  }) => (
    <div
      className={`
    relative p-4 rounded-xl bg-white/95
    transition-all duration-300 shadow-sm
    ${isActive ? "scale-105" : ""}
  `}
    >
      {isActive && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-3 h-3 bg-blue-500 rotate-45" />
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`
        w-14 h-14 ${color} rounded-lg
        flex items-center justify-center
      `}
        >
          {icon}
        </div>
        <p className="font-medium text-gray-800 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{score}</p>
      </div>
    </div>
  ),
);

PlayerCard.displayName = "PlayerCard";

// Memoized GameStatus banner with animations
const GameStatus = memo(
  ({
    gameId,
    isXNext,
    winner,
    isGameCompleted, // NEW Prop added
  }: {
    gameId: string;
    isXNext: boolean;
    winner: string | null;
    isGameCompleted: boolean;
  }) => {
    let message: React.ReactNode;
    if (winner) {
      message = (
        <span className="text-green-600">
          {winner === "X" ? "You Won! 🎉" : "System Won! 🤖"}
        </span>
      );
    } else if (isGameCompleted) {
      // NEW branch
      message = (
        <span className="font-semibold text-xl text-gray-600">
          Game Completed
        </span>
      );
    } else {
      message = (
        <span
          className={`font-semibold text-xl ${isXNext ? "text-green-600" : "text-red-500"}`}
        >
          {isXNext ? "Your Turn" : "System's Turn"}
        </span>
      );
    }

    return (
      <div className="flex flex-col items-center">
        {/* Fixed size container for status message to prevent layout shift */}
        <div className="w-40 h-10 flex items-center justify-center bg-gray-100 rounded-lg shadow-sm">
          {message}
        </div>
        <div className="text-sm text-gray-500 mt-2">Game ID: {gameId}</div>
      </div>
    );
  },
);

GameStatus.displayName = "GameStatus";

// Main TicTacToeBoard component
const TicTacToeBoard = () => {
  const { smartSession, setSmartSession } = useTicTacToeContext();
  const { handleSystemMove, handleUserMove } = useTicTacToeActions();
  const [isLoading, setIsLoading] = useState(false);
  const gameState = smartSession?.gameInfo?.gameState;

  if (!gameState?.gameId) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-red-500 font-semibold bg-red-50 px-4 py-2 rounded-lg">
          Error: Game ID not found. Please try again.
        </p>
      </div>
    );
  }

  // Calculate the score counts and check if the board is full.
  const xCount = gameState.board.filter((cell) => cell === "X").length;
  const oCount = gameState.board.filter((cell) => cell === "O").length;
  const isBoardFull = gameState.board.every(
    (cell) => cell === "X" || cell === "O",
  );
  const isGameCompleted = isBoardFull && !gameState.winner;

  const onMove = useCallback(
    async (gameId: string, position: number) => {
      // Early exit if the game is already completed
      if (
        gameState.winner ||
        gameState.board.every((cell) => cell === "X" || cell === "O")
      ) {
        return;
      }

      setIsLoading(true);
      try {
        const data = await handleUserMove(gameId, position);
        const { userOpIdentifier } = data;
        await getCallsStatus(userOpIdentifier);

        const updatedBoard = await getBoardState(gameId);
        // Note: Ensure the empty cell representation is consistent.
        const movesCount = updatedBoard.filter((cell) => cell !== 0).length;
        const winnerInfo =
          movesCount >= 5
            ? checkWinner([...updatedBoard])
            : { winner: null, winningLine: null };

        const newGameState = {
          board: transformBoard([...updatedBoard]),
          isXNext: false,
          winner: winnerInfo.winner,
          winningLine: winnerInfo.winningLine,
          gameId,
        };

        setSmartSession((prev) => ({
          ...prev!,
          gameInfo: {
            gameState: newGameState,
            gameStarted: prev?.gameInfo?.gameStarted || false,
          },
        }));

        // If no winner and moves remain, let the system move.
        if (!winnerInfo.winner && movesCount < 9) {
          await handleSystemMove(gameId);
        }
      } catch (e) {
        console.warn("Error:", e);
        toast.error("Error", {
          description: (e as Error)?.message || "Error making move",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [gameState, handleSystemMove, handleUserMove, setSmartSession],
  );

  return (
    <div className="flex flex-col items-center gap-6 p-4 ">
      <div className="w-full max-w-xl flex flex-col items-center gap-6">
        <div className="flex max-w-xl justify-between items-center w-full gap-4">
          <PlayerCard
            icon={<Cross1Icon width={24} height={24} color="white" />}
            label="You"
            score={xCount}
            isActive={gameState.isXNext && !gameState.winner}
            color="bg-green-500"
          />
          <GameStatus
            gameId={gameState.gameId}
            isXNext={gameState.isXNext}
            winner={gameState.winner}
            isGameCompleted={isGameCompleted} // NEW prop passed here
          />
          <PlayerCard
            icon={<CircleIcon width={24} height={24} color="white" />}
            label="System"
            score={oCount}
            isActive={!gameState.isXNext && !gameState.winner}
            color="bg-red-500"
          />
        </div>

        <div className="relative flex justify-center w-full">
          <div className="grid grid-cols-3 gap-3 bg-white/95 p-6 rounded-xl shadow-sm w-96 h-96 mx-auto">
            {Array(9)
              .fill(null)
              .map((_, index) => (
                <PositionSquare
                  key={index}
                  gameState={gameState}
                  index={index}
                  handleMove={onMove}
                  loading={isLoading}
                  isAvailable={!gameState.board[index]}
                />
              ))}
          </div>

          {/* Overlays */}
          {isGameCompleted ? (
            <div className="absolute inset-0 bg-gray-200/50 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium shadow-sm w-40 text-center">
                Game Completed
              </div>
            </div>
          ) : !gameState.isXNext && !gameState.winner ? (
            <div className="absolute inset-0 bg-blue-50/30 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium shadow-sm w-40 text-center">
                System&apos;s Turn
              </div>
            </div>
          ) : (
            isLoading &&
            gameState.isXNext && (
              <div className="absolute inset-0 bg-green-50/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium shadow-sm w-40 text-center">
                  Processing Your Move...
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(TicTacToeBoard);
