import React from "react";
import { CircleIcon, Cross1Icon } from "@radix-ui/react-icons";
import { GameState } from "@/context/TicTacToeContextProvider";

function PositionSquare({
  gameState,
  index,
  handleMove,
  loading,
}: {
  gameState: GameState;
  index: number;
  handleMove: (gameId: string, position: number) => void;
  loading: boolean;
}) {
  const isWinningSquare = gameState.winningLine?.includes(index);

  return (
    <button
      className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-xl sm:text-2xl md:text-3xl font-bold border-2 flex items-center justify-center 
        ${isWinningSquare ? "bg-yellow-100 border-yellow-400" : "border-gray-300"} 
        ${!gameState.board[index] && !loading ? "hover:bg-gray-100" : ""} 
        transition-colors duration-200`}
      onClick={() => handleMove(gameState.gameId!, index)}
      disabled={loading || !!gameState.board[index] || !!gameState.winner}
    >
      {!gameState.board[index] && index + 1}
      {gameState.board[index] === "X" && (
        <Cross1Icon width={40} height={40} color="green" />
      )}
      {gameState.board[index] === "O" && (
        <CircleIcon width={40} height={40} color="red" />
      )}
    </button>
  );
}

export default PositionSquare;
