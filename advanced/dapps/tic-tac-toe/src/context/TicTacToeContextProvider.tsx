"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  GRANTED_PERMISSIONS_KEY,
  removeItem,
  TICTACTOE_STARTED,
  TICTACTOE_STATE,
  WC_COSIGNER_DATA,
} from "../utils/LocalStorage";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { GrantPermissionsReturnType } from "viem/experimental";
import type { AddPermissionResponse } from "@/utils/WalletConnectCosignerUtils";
import { Chain } from "viem";
import {
  type Provider,
  useWagmiAvailableCapabilities,
} from "@/hooks/useWagmiActiveCapabilities";
import { EIP_7715_RPC_METHODS } from "@/utils/EIP5792Utils";
import { useAccount } from "wagmi";

export interface GameState {
  board: (string | null)[];
  isXNext: boolean;
  winner: string | null;
  winningLine: number[] | null;
  gameId: string | null;
}

interface TicTacToeContextType {
  projectId: string;
  provider: Provider | undefined;
  address: string | undefined;
  chain: Chain | undefined;
  isWalletConnected: boolean;
  isWalletConnecting: boolean;
  grantedPermissions: GrantPermissionsReturnType | undefined;
  setGrantedPermissions: React.Dispatch<
    React.SetStateAction<GrantPermissionsReturnType | undefined>
  >;
  wcCosignerData: AddPermissionResponse | undefined;
  setWCCosignerData: React.Dispatch<
    React.SetStateAction<AddPermissionResponse | undefined>
  >;
  clearGrantedPermissions: () => void;
  gameState: GameState | undefined;
  setGameState: React.Dispatch<React.SetStateAction<GameState | undefined>>;
  gameStarted: boolean;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
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
  const { provider } = useWagmiAvailableCapabilities({
    method: EIP_7715_RPC_METHODS.WALLET_GRANT_PERMISSIONS,
  });
  const { chain, address, isConnected, status, isConnecting } = useAccount();

  const [grantedPermissions, setGrantedPermissions] = useLocalStorageState<
    GrantPermissionsReturnType | undefined
  >(GRANTED_PERMISSIONS_KEY, undefined);
  const [wcCosignerData, setWCCosignerData] = useLocalStorageState<
    AddPermissionResponse | undefined
  >(WC_COSIGNER_DATA, undefined);
  const isWalletConnected =
    isConnected &&
    !isConnecting &&
    status === "connected" &&
    Boolean(provider) &&
    Boolean(chain) &&
    Boolean(address);

  const isWalletConnecting =
    isConnecting || ["reconnecting", "connecting"].includes(status);

  const [gameState, setGameState] = useLocalStorageState<GameState | undefined>(
    TICTACTOE_STATE,
    undefined,
  );
  const [gameStarted, setGameStarted] = useLocalStorageState(
    TICTACTOE_STARTED,
    false,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearGrantedPermissions() {
    removeItem(GRANTED_PERMISSIONS_KEY);
    setGrantedPermissions(undefined);
  }

  return (
    <TicTacToeContext.Provider
      value={{
        projectId,
        isWalletConnected,
        isWalletConnecting,
        provider,
        address,
        chain,
        grantedPermissions,
        wcCosignerData,
        clearGrantedPermissions,
        setGrantedPermissions,
        setWCCosignerData,
        gameState,
        setGameState,
        gameStarted,
        setGameStarted,
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
