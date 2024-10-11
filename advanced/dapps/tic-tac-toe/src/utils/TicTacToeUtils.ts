import { encodeFunctionData, parseEther } from "viem";
import { ticTacToeAbi } from "./abi";
import {
  GrantPermissionsParameters,
  GrantPermissionsReturnType,
} from "viem/experimental";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getBlockchainApiRpcUrl } from "./ChainsUtil";
import { executeActionsWithECDSAAndCosignerPermissions } from "./ERC7715PermissionsAsyncUtils";

export const ticTacToeAddress =
  "0x6Fd3d86C43BD571F40a3eF2b6BB58B257eC2F392" as `0x${string}`;
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!PROJECT_ID) {
  throw new Error("Missing required environment variables");
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(getBlockchainApiRpcUrl(baseSepolia.id), { timeout: 300000 }),
});

type Board = number[];

export function getTicTacToeAsyncPermissions(
  keys: string[],
): GrantPermissionsParameters {
  return {
    expiry: Date.now() + 24 * 60 * 60,
    permissions: [
      {
        type: {
          custom: "tic-tac-toe-move",
        },
        data: {
          target: ticTacToeAddress,
          abi: ticTacToeAbi,
          valueLimit: parseEther("0").toString(),
          functionName: "makeMove(uint256,uint8)",
        },
        policies: [],
      },
    ],
    signer: {
      type: "keys",
      data: {
        ids: keys,
      },
    },
  };
}

export async function createGame(
  applicationPrivateKey: string,
  playerOAddress: `0x${string}`,
) {
  const account = privateKeyToAccount(applicationPrivateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });
  const txHash = await walletClient.writeContract({
    address: ticTacToeAddress,
    abi: ticTacToeAbi,
    functionName: "createGame",
    args: [playerOAddress],
  });

  return txHash;
}

export async function getGameIdFromReceipt(txHash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  const gameCreatedEvent = receipt.logs[0];

  if (!gameCreatedEvent) {
    throw new Error("Failed to retrieve game ID from event");
  }

  const decodedGameId = decodeEventLog({
    abi: ticTacToeAbi,
    eventName: "GameCreated",
    topics: gameCreatedEvent.topics,
  }).args.gameId;

  return decodedGameId.toString();
}

export async function getBoardState(gameId: string): Promise<Board> {
  return Array.from(
    await publicClient.readContract({
      address: ticTacToeAddress,
      abi: ticTacToeAbi,
      functionName: "getBoard",
      args: [BigInt(gameId)],
    }),
  ) as Board;
}

export function checkWinner(board: number[]): {
  winner: string | null;
  winningLine: number[] | null;
} {
  const winningPositions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const positions of winningPositions) {
    const [a, b, c] = positions;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] === 1 ? "X" : "O", winningLine: positions };
    }
  }

  return { winner: null, winningLine: null };
}

export function transformBoard(board: number[]): string[] {
  return board.map((cell) => {
    if (cell === 1) {
      return "X";
    }
    if (cell === 2) {
      return "O";
    }

    return "";
  });
}

export async function makeUserMove(
  applicationPrivateKey: string,
  gameId: string,
  position: number,
  permissions: GrantPermissionsReturnType,
  pci: string,
) {
  const gameIdBigInt = BigInt(gameId);
  const makeMoveCallData = encodeFunctionData({
    abi: ticTacToeAbi,
    functionName: "makeMove",
    args: [gameIdBigInt, position],
  });
  const makeMoveCallDataExecution = [
    {
      to: ticTacToeAddress,
      value: parseEther("0"),
      data: makeMoveCallData,
    },
  ];
  return await executeActionsWithECDSAAndCosignerPermissions({
    ecdsaPrivateKey: applicationPrivateKey as `0x${string}`,
    pci,
    permissions,
    chain: baseSepolia,
    actions: makeMoveCallDataExecution,
  });
}

export async function makeComputerMove(
  applicationPrivateKey: string,
  gameId: string,
  position: number,
) {
  const account = privateKeyToAccount(applicationPrivateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  return await walletClient.writeContract({
    address: ticTacToeAddress,
    abi: ticTacToeAbi,
    functionName: "makeMove",
    args: [BigInt(gameId), position],
  });
}

export function findRandomEmptyPosition(board: number[]): number | null {
  // Create an array of empty positions
  const emptyPositions = board
    .map((cell, index) => (cell === 0 ? index : null)) // 0 indicates an empty cell
    .filter((index) => index !== null) as number[]; // Filter out null values

  // If there are no empty positions, return null
  if (emptyPositions.length === 0) return null;

  // Select a random index from the empty positions
  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex]; // Return the random empty position
}

export async function waitForTransaction(txHash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash: txHash });
}
