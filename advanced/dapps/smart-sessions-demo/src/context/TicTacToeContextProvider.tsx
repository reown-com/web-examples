"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { TICTACTOE_APP_DATA, removeItem } from "../utils/LocalStorage";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";

export interface GameState {
  board: (string | null)[];
  isXNext: boolean;
  winner: string | null;
  winningLine: number[] | null;
  gameId: string | null;
}

interface TicTacToeContextType {
  projectId: string;
  smartSession:
    | {
        grantedPermissions: SmartSessionGrantPermissionsResponse;
        gameInfo:
          | {
              gameState: GameState;
              gameStarted: boolean;
            }
          | undefined;
      }
    | undefined;
  setSmartSession: React.Dispatch<
    React.SetStateAction<
      | {
          grantedPermissions: SmartSessionGrantPermissionsResponse;
          gameInfo:
            | {
                gameState: GameState;
                gameStarted: boolean;
              }
            | undefined;
        }
      | undefined
    >
  >;
  clearSmartSession: () => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const TicTacToeContext = createContext<TicTacToeContextType | undefined>(
  undefined,
);

export function TicTacToeContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
  }

  const [smartSession, setSmartSession] = useLocalStorageState<
    | {
        grantedPermissions: SmartSessionGrantPermissionsResponse;
        gameInfo:
          | {
              gameState: GameState;
              gameStarted: boolean;
            }
          | undefined;
      }
    | undefined
  >(TICTACTOE_APP_DATA, undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearSmartSession() {
    removeItem(TICTACTOE_APP_DATA);
    setSmartSession(undefined);
  }

  return (
    <TicTacToeContext.Provider
      value={{
        projectId,
        smartSession,
        setSmartSession,
        clearSmartSession,
        loading,
        setLoading,
        error,
        setError,
      }}
    >
      {children}
    </TicTacToeContext.Provider>
  );
}

export function useTicTacToeContext() {
  const context = useContext(TicTacToeContext);
  if (!context) {
    throw new Error(
      "useTicTacToeContext must be used within a TicTacToeContextProvider",
    );
  }

  return context;
}
