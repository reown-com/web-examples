"use client";
import React, { useState, useEffect } from "react";
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

// This component contains all your hooks and JSX.
function TicTacToeInner() {
  const [isLoading, setIsLoading] = useState(false);
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
      const errorMessage = (e as Error)?.message || "Error starting game";
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  // Subcomponent: Loading screen shown during wallet connection
  const LoadingScreen = () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="w-full max-w-sm text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          TicTacToe Game
        </h1>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="animate-spin h-8 w-8 text-gray-600 dark:text-gray-400" />
          <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    </main>
  );

  const NotConnectedScreen = () => (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="w-full max-w-md text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          TicTacToe Game
        </h1>
        <Card className="w-full bg-gradient-to-br from-purple-100 to-indigo-100 shadow-lg mb-4 items-center justify-center">
          <CardContent className="p-4 ">
            <p className="text-sm text-gray-700 mb-2">
              When connecting, please use your Email Wallet with:
            </p>
            <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
              youremail
              <span className="text-blue-500 dark:text-blue-400">
                +smart-sessions
              </span>
              @domain.com
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Example: john
              <span className="text-blue-500 dark:text-blue-400">
                +smart-sessions
              </span>
              @doe.com
            </p>
          </CardContent>
          <CardFooter className="p-4 justify-center">
            <div className="flex ">
              <ConnectWalletButton />
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );

  const GameIntroCard = () => (
    <div className="w-full max-w-md mx-auto mb-12">
      <div className="flex w-full mb-4 items-center justify-center">
        <w3m-button />
      </div>
      <Card className="w-full bg-gradient-to-br from-purple-100 to-indigo-100 shadow-lg">
        <CardHeader className="p-4">
          <CardTitle className="text-center text-xl sm:text-2xl md:text-3xl font-bold text-indigo-800">
            Let&apos;s Play TicTacToe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-base text-gray-700 leading-relaxed">
            Players take turns placing their marks in empty squares. The first
            to align three marks in a row—vertically, horizontally, or
            diagonally—wins. If all squares are filled and no one has three in a
            row, the game ends in a tie.
          </p>
        </CardContent>
        <CardFooter className="p-4 justify-center">
          <div className="flex items-center justify-center">
            <Button
              onClick={onStartGame}
              disabled={isLoading}
              className="w-full max-w-xs bg-indigo-700 hover:bg-indigo-600 text-white"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Starting...</span>
                </div>
              ) : (
                "Start New Game"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  const GameBoard = () => (
    <div className="w-full max-w-md mx-auto mb-12">
      <div className="flex flex-col items-center gap-4 mb-4">
        <Button
          variant="destructive"
          className="w-full max-w-xs"
          onClick={resetGame}
        >
          End Game
        </Button>
        <TicTacToeBoard />
      </div>
    </div>
  );

  if (isWalletConnecting) {
    return <LoadingScreen />;
  }

  if (!isWalletConnected) {
    return <NotConnectedScreen />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-100 to-purple-100">
      {grantedPermissions && gameStarted ? <GameBoard /> : <GameIntroCard />}
    </main>
  );
}

// The outer component only handles the mounting check.
export default function TicTacToe() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;
  return <TicTacToeInner />;
}
