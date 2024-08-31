"use client";

import { useTicTacToeContext } from "@/context/TicTacToeContextProvider";
import { useTicTacToeActions } from "@/hooks/useTicTacToeActions";
import React from "react";
import { CircleIcon, Cross1Icon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import DisplayPlayerScore from "./DisplayPlayerScore";
import PositionSquare from "./PositionSquare";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { sepolia } from "viem/chains";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { http } from "viem";
import {
  checkWinner,
  getBoardState,
  transformBoard,
} from "@/utils/TicTacToeUtils";
import { getBundlerUrl } from "@/utils/ConstantsUtil";

function TicTacToeBoard() {
  const { gameState, setGameState } = useTicTacToeContext();
  const { handleSystemMove, handleUserMove } = useTicTacToeActions();
  const [isLoading, setIsLoading] = React.useState(false);

  if (!gameState?.gameId) {
    console.warn("Game ID not found");
    return (
      <p className="text-center text-red-500">
        Error: Game ID not found. Please try again.
      </p>
    );
  }

  async function onMove(gameId: string, position: number) {
    setIsLoading(true);
    try {
      const data = await handleUserMove(gameId, position);
      const { userOpIdentifier } = data;
      const bundlerClient = createPimlicoBundlerClient({
        chain: sepolia,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        transport: http(getBundlerUrl(), {
          timeout: 300000,
        }),
      });
      await bundlerClient.waitForUserOperationReceipt({
        hash: userOpIdentifier,
      });
      console.log("User move made successfully");
      // After the user's move, read the updated board state
      const updatedBoard = await getBoardState(gameId);
      console.log("Updated board:", updatedBoard);
      // Check for a winner after the user's move
      const winnerInfo = checkWinner([...updatedBoard]);
      const gameState = {
        board: transformBoard([...updatedBoard]),
        isXNext: false,
        winner: winnerInfo.winner,
        winningLine: winnerInfo.winningLine,
        gameId,
      };
      setGameState(gameState);
      if (!winnerInfo.winner) {
        await handleSystemMove(gameId);
      }
    } catch (e) {
      console.warn("Error:", e);
      const errorMessage = (e as Error)?.message || "Error making move";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const xCount = gameState.board.filter((cell) => cell === "X").length;
  const oCount = gameState.board.filter((cell) => cell === "O").length;

  return (
    <div className="flex flex-col items-center gap-4 p-4 relative">
      <div className="flex flex-col gap-4 items-center justify-center">
        <div className="flex w-full items-center justify-between gap-4">
          {/* Player (You) */}
          <DisplayPlayerScore
            icon={<Cross1Icon width={40} height={40} color="white" />}
            label="You"
            score={xCount}
            color="bg-green-500"
          />
          <div className="flex items-center">
            {gameState.winner ? (
              <h2 className="text-xl sm:text-2xl text-center bg-green-100 text-green-700 p-4 rounded-lg">
                Winner: {gameState.winner}
              </h2>
            ) : (
              <div className="flex flex-col gap-2">
                <h2 className="text-md sm:text-xl text-center">
                  Game ID: {gameState.gameId}
                </h2>
                <h2 className="text-md sm:text-xl text-center font-semibold">
                  {gameState.isXNext ? "Your Turn" : "System Turn"}
                </h2>
              </div>
            )}
          </div>
          {/* System (Opponent) */}
          <DisplayPlayerScore
            icon={<CircleIcon width={40} height={40} color="white" />}
            label="System"
            score={oCount}
            color="bg-red-500"
          />
        </div>
        {/* Game Board */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Array(9)
            .fill(null)
            .map((_, index) => (
              <PositionSquare
                key={index}
                gameState={gameState}
                index={index}
                handleMove={onMove}
                loading={isLoading}
              />
            ))}
        </div>
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default TicTacToeBoard;
