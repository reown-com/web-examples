"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import TicTacToeBoard from "./TicTacToeBoard";
import { useTicTacToeContext } from "@/context/TicTacToeContextProvider";
import { useTicTacToeActions } from "@/hooks/useTicTacToeActions";
import { useAppKitAccount } from "@reown/appkit/react";

export default function TicTacToe() {
  const [isLoading, setIsLoading] = React.useState(false);
  const { smartSession, clearSmartSession } = useTicTacToeContext();
  const { startGame } = useTicTacToeActions();
  const { status, address } = useAppKitAccount();
  const isWalletConnected = status === "connected" || address !== undefined;
  const isWalletConnecting = status
    ? ["connecting", "reconnecting"].includes(status)
    : false;
  const grantedPermissions = smartSession?.grantedPermissions;
  const gameStarted = smartSession?.gameInfo?.gameStarted;

  const resetGame = () => {
    clearSmartSession();
  };

  async function onStartGame() {
    setIsLoading(true);
    try {
      await startGame();
    } catch (e) {
      console.warn("Error:", e);
      const errorMessage = (e as Error)?.message || "Error starting game";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isWalletConnecting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="w-full max-w-sm text-center mb-12">
          <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            TicTacToe Game
          </h1>
          <div className="flex w-full mb-4 items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 mr-2" />
            <p className="text-lg text-gray-600 dark:text-gray-400 font-bold">
              Loading...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="w-full max-w-md text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          TicTacToe Game
        </h1>
        {isWalletConnected && (
          <div className="flex w-full mb-4 items-center justify-center">
            <w3m-button />
          </div>
        )}
        {!isWalletConnected && !grantedPermissions && !isWalletConnecting && (
          <p className="text-lg text-gray-600 dark:text-gray-400 font-bold mb-4">
            Connect Wallet to get started.
          </p>
        )}

        {grantedPermissions && gameStarted && (
          <div className="flex flex-col items-center mb-4 gap-4">
            <Button
              variant="destructive"
              className="items-center mb-4"
              onClick={resetGame}
            >
              End Game
            </Button>
            <TicTacToeBoard />
          </div>
        )}

        {(!grantedPermissions || !gameStarted) && (
          <Card className="w-full mb-4 max-w-2xl bg-gradient-to-br from-purple-100 to-indigo-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl sm:text-2xl md:text-3xl font-bold text-indigo-800">
                Lets Play TicTacToe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-start text-base sm:text-md md:text-lg text-gray-700 leading-relaxed">
                Players take turns placing their marks in empty squares. The
                first to align three marks in a row—vertically, horizontally, or
                diagonally—wins. If all squares are filled and no one has three
                in a row, the game ends in a tie.
              </p>
            </CardContent>
            <CardFooter>
              <div className="flex w-full mb-4 items-center justify-center">
                {isWalletConnected && !gameStarted ? (
                  <Button
                    onClick={onStartGame}
                    disabled={isLoading}
                    className="w-full max-w-xs bg-indigo-700 hover:bg-indigo-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      "Start New Game"
                    )}
                  </Button>
                ) : (
                  <ConnectWalletButton />
                )}
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
