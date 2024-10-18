import {
  findRandomEmptyPosition,
  getBoardState,
  makeComputerMove,
} from "@/utils/TicTacToeUtils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json();

    if (typeof gameId !== "string") {
      return NextResponse.json({ message: "Invalid game ID" }, { status: 400 });
    }
    const board = await getBoardState(gameId);
    const computerPosition = findRandomEmptyPosition(board);
    if (computerPosition === null) {
      return NextResponse.json({ message: "Game is over" }, { status: 400 });
    }
    const APPLICATION_PRIVATE_KEY = process.env.APPLICATION_PRIVATE_KEY;
    if (!APPLICATION_PRIVATE_KEY) {
      return NextResponse.json(
        { message: "Missing required environment variables" },
        { status: 400 },
      );
    }
    const systemMoveTxHash = await makeComputerMove(
      APPLICATION_PRIVATE_KEY,
      gameId,
      computerPosition,
    );

    return NextResponse.json({ transactionHash: systemMoveTxHash });
  } catch (e) {
    console.error("Error:", e);
    const errorMessage = (e as Error)?.message || "Error making move";
    return NextResponse.json(
      { message: "Error making move", error: errorMessage },
      { status: 500 },
    );
  }
}
