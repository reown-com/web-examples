import {
  GameState,
  useTicTacToeContext,
} from "@/context/TicTacToeContextProvider";
import {
  decodeUncompressedPublicKey,
  encodePublicKeyToDID,
  hexStringToBase64,
} from "@/utils/EncodingUtils";
import { walletActionsErc7715 } from "viem/experimental";
import { createPublicClient, custom } from "viem";
import {
  checkWinner,
  getBoardState,
  getGameIdFromReceipt,
  getTicTacToeAsyncPermissions,
  transformBoard,
  waitForTransaction,
} from "@/utils/TicTacToeUtils";
import { WalletConnectCosigner } from "@/utils/WalletConnectCosignerUtils";
import { toast } from "sonner";

export function useTicTacToeActions() {
  const {
    gameState,
    setGameState,
    gameStarted,
    setGameStarted,
    setLoading,
    setGrantedPermissions,
    setWCCosignerData,
    grantedPermissions,
    wcCosignerData,
    address,
    chain,
    provider,
  } = useTicTacToeContext();

  async function handleUserMove(gameId: string, index: number) {
    if (
      !gameStarted ||
      !gameState ||
      gameState.board[index] ||
      gameState.winner
    ) {
      return;
    }
    if (!grantedPermissions) {
      throw new Error("No permissions found");
    }
    if (!wcCosignerData) {
      throw new Error("Missing Wallet Connect Cosigner data");
    }
    try {
      const response = await fetch("/api/game/make-move/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          position: index,
          permissions: grantedPermissions,
          pci: wcCosignerData.pci,
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
    if (!gameStarted || !gameState || gameState.winner) {
      return;
    }
    try {
      const systemMoveResponse = await fetch("/api/game/make-move/system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId }),
      });

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
      setGameState(gameState as GameState);
    } catch (e) {
      console.warn("Error making move:", e);
      throw Error("Error making system move");
    } finally {
      setLoading(false);
    }
  }

  async function startGame() {
    if (!chain || !address || !provider) {
      throw new Error("Wallet not connected");
    }
    const caip10Address = `eip155:${chain?.id}:${address}`;

    const getDappKeyResponse = await fetch("/api/signer", {
      method: "GET",
    });
    const dappSignerData = await getDappKeyResponse.json();
    const dAppECDSAPublicKey = dappSignerData.key;
    const walletConnectCosigner = new WalletConnectCosigner();
    const addPermissionResponse = await walletConnectCosigner.addPermission(
      caip10Address,
      {
        permissionType: "tic-tac-toe-move",
        data: "",
        onChainValidated: false,
        required: true,
      },
    );
    const cosignerPublicKey = decodeUncompressedPublicKey(
      addPermissionResponse.key,
    );
    const dAppSecp256k1DID = encodePublicKeyToDID(
      dAppECDSAPublicKey,
      "secp256k1",
    );
    const coSignerSecp256k1DID = encodePublicKeyToDID(
      cosignerPublicKey,
      "secp256k1",
    );

    const publicClient = createPublicClient({
      chain,
      transport: custom(provider),
    }).extend(walletActionsErc7715());

    const ticTacToePermissions = getTicTacToeAsyncPermissions([
      coSignerSecp256k1DID,
      dAppSecp256k1DID,
    ]);
    const approvedPermissions =
      await publicClient.grantPermissions(ticTacToePermissions);
    if (!approvedPermissions) {
      throw new Error("Failed to obtain permissions");
    }

    await walletConnectCosigner.updatePermissionsContext(caip10Address, {
      pci: addPermissionResponse.pci,
      context: {
        expiry: approvedPermissions.expiry,
        signer: {
          type: "tic-tac-toe-move",
          data: {
            ids: [
              addPermissionResponse.key,
              hexStringToBase64(dAppECDSAPublicKey),
            ],
          },
        },
        signerData: {
          userOpBuilder: "0x",
        },
        permissionsContext: approvedPermissions.permissionsContext,
        factory: approvedPermissions.factory || "",
        factoryData: approvedPermissions.factoryData || "",
      },
    });
    const response = await fetch("/api/game/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        permissions: approvedPermissions,
        pci: addPermissionResponse.pci,
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
    setWCCosignerData(addPermissionResponse);
    setGrantedPermissions(approvedPermissions);
    setGameState(initialGameState);
    setGameStarted(true);
    toast.success("Game ready to play");
  }

  return {
    handleUserMove,
    handleSystemMove,
    startGame,
  };
}
