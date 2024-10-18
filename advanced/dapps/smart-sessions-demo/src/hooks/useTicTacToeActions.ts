import { useTicTacToeContext } from "@/context/TicTacToeContextProvider";
import { toHex } from "viem";
import {
  checkWinner,
  getBoardState,
  getGameIdFromReceipt,
  getSampleAsynTicTacToePermissions,
  transformBoard,
  waitForTransaction,
} from "@/utils/TicTacToeUtils";
import { toast } from "sonner";
import {
  grantPermissions,
  SmartSessionGrantPermissionsRequest,
} from "@reown/appkit-experimental/smart-session";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";

export function useTicTacToeActions() {
  const { setLoading, smartSession, setSmartSession } = useTicTacToeContext();
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  async function handleUserMove(gameId: string, index: number) {
    if (!smartSession) {
      throw new Error("Smart Session not found");
    }
    const { grantedPermissions, gameInfo } = smartSession;
    if (!gameInfo) {
      throw new Error("Game info not found");
    }

    const { gameState, gameStarted } = gameInfo;
    if (!gameStarted) {
      throw new Error("Game not started");
    }

    if (!gameState || gameState.board[index] || gameState.winner) {
      throw new Error("Invalid move");
    }
    if (!grantedPermissions) {
      throw new Error("No permissions found");
    }
    try {
      const response = await fetch("/api/tictactoe/make-move/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          position: index,
          permissions: grantedPermissions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data?.message || "Error making your move";
        throw new Error(errorMessage);
      }
      return data;
    } catch (e) {
      console.warn("Error making user move:", e);
      throw Error("Error making user move");
    } finally {
      setLoading(false);
    }
  }

  async function handleSystemMove(gameId: string) {
    if (!smartSession) {
      throw new Error("Smart Session not found");
    }
    const { grantedPermissions, gameInfo } = smartSession;
    if (!gameInfo) {
      throw new Error("Game info not found");
    }

    const { gameState, gameStarted } = gameInfo;
    if (!gameStarted) {
      throw new Error("Game not started");
    }

    if (!gameState || gameState.winner) {
      throw new Error("Invalid move");
    }
    if (!grantedPermissions) {
      throw new Error("No permissions found");
    }
    try {
      const systemMoveResponse = await fetch(
        "/api/tictactoe/make-move/system",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameId }),
        },
      );

      const systemMoveResponseData = await systemMoveResponse.json();
      if (!systemMoveResponse.ok) {
        const errorMessage =
          systemMoveResponseData?.message || "Error making system move";
        throw new Error(errorMessage);
      }
      const { transactionHash } = systemMoveResponseData;
      await waitForTransaction(transactionHash);
      console.log("System move made successfully");
      // After the system's move, read the updated board state
      const updatedBoardAfterSystemMove = await getBoardState(gameId);
      console.log(
        "Updated board after system move:",
        updatedBoardAfterSystemMove,
      );

      // Check for a winner after the system's move
      const winnerInfoAfterSystemMove = checkWinner([
        ...updatedBoardAfterSystemMove,
      ]);

      const gameState = {
        board: transformBoard([...updatedBoardAfterSystemMove]),
        isXNext: true,
        winner: winnerInfoAfterSystemMove.winner,
        winningLine: winnerInfoAfterSystemMove.winningLine,
        gameId,
      };
      setSmartSession((prev) =>
        prev
          ? {
              ...prev,
              gameInfo: {
                ...prev.gameInfo,
                gameState,
                gameStarted: prev.gameInfo?.gameStarted ?? false,
              },
            }
          : prev,
      );
    } catch (e) {
      console.warn("Error making move:", e);
      throw Error("Error making system move");
    } finally {
      setLoading(false);
    }
  }

  async function startGame() {
    if (!chainId || !address) {
      throw new Error("Wallet not connected");
    }

    const getDappKeyResponse = await fetch("/api/signer", {
      method: "GET",
    });
    const dappSignerData = await getDappKeyResponse.json();
    const dAppECDSAPublicKey = dappSignerData.key;
    const sampleTictacToePermissions = getSampleAsynTicTacToePermissions();
    const grantTicTacToePermissions: SmartSessionGrantPermissionsRequest = {
      // Adding 24 hours to the current time
      expiry: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      chainId: toHex(chainId),
      address: address as `0x${string}`,
      signer: {
        type: "keys",
        data: {
          keys: [
            {
              type: "secp256k1",
              publicKey: dAppECDSAPublicKey,
            },
          ],
        },
      },
      permissions: sampleTictacToePermissions["permissions"],
      policies: sampleTictacToePermissions["policies"] || [],
    };
    const approvedPermissions = await grantPermissions(
      grantTicTacToePermissions,
    );

    const response = await fetch("/api/tictactoe/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        permissions: approvedPermissions,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error("Error creating game");
    }
    const { transactionHash } = data;
    const gameId = await getGameIdFromReceipt(transactionHash);
    const initialGameState = {
      board: Array(9).fill(null),
      isXNext: true,
      winner: null,
      winningLine: null,
      gameId,
      transactionHash: transactionHash,
    };

    setSmartSession({
      grantedPermissions: approvedPermissions,
      gameInfo: {
        gameState: initialGameState,
        gameStarted: true,
      },
    });

    toast.success("Game ready to play");
  }

  return {
    handleUserMove,
    handleSystemMove,
    startGame,
  };
}
