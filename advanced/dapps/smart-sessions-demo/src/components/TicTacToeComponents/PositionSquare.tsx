import React from "react";
import { CircleIcon, Cross1Icon } from "@radix-ui/react-icons";
import { GameState } from "@/context/TicTacToeContextProvider";

function PositionSquare({
  gameState,
  index,
  handleMove,
  loading,
  isAvailable,
}: {
  gameState: GameState;
  index: number;
  handleMove: (gameId: string, position: number) => void;
  loading: boolean;
  isSystemThinking?: boolean;
  isAvailable?: boolean;
}) {
  const isWinningSquare = gameState.winningLine?.includes(index);
  const isDisabled =
    loading ||
    !!gameState.board[index] ||
    !!gameState.winner ||
    !gameState.isXNext; // Disable when it's not player's turn

  const baseClasses = `
    
    text-lg
    font-medium
    flex items-center justify-center 
    rounded-lg
    transition-all duration-200
    relative
    ${isWinningSquare ? "bg-yellow-50" : "bg-gray-50"}
    ${!isDisabled && !gameState.board[index] ? "hover:bg-gray-100 cursor-pointer" : "cursor-not-allowed"}
    ${isAvailable ? "bg-blue-50" : ""}
    border border-gray-200
    ${isDisabled && !gameState.board[index] ? "text-gray-300" : "text-gray-400"}
  `;

  return (
    <button
      className={baseClasses}
      onClick={() => handleMove(gameState.gameId!, index)}
      disabled={isDisabled}
      aria-label={`Square ${index + 1}`}
    >
      {!gameState.board[index] ? (
        <span className="text-inherit">{index + 1}</span>
      ) : gameState.board[index] === "X" ? (
        <Cross1Icon width={32} height={32} className="text-green-500" />
      ) : (
        <CircleIcon width={32} height={32} className="text-red-500" />
      )}
    </button>
  );
}

export default React.memo(PositionSquare, (prevProps, nextProps) => {
  return (
    prevProps.gameState.board[prevProps.index] ===
      nextProps.gameState.board[nextProps.index] &&
    prevProps.loading === nextProps.loading &&
    prevProps.isSystemThinking === nextProps.isSystemThinking &&
    prevProps.isAvailable === nextProps.isAvailable &&
    prevProps.gameState.isXNext === nextProps.gameState.isXNext && // Add isXNext to comparison
    (prevProps.gameState.winningLine?.includes(prevProps.index) ?? false) ===
      (nextProps.gameState.winningLine?.includes(nextProps.index) ?? false)
  );
});
