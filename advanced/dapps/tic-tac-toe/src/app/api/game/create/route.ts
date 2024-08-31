import { createGame } from "@/utils/TicTacToeUtils";
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { GrantPermissionsReturnType } from "viem/experimental";

export async function POST(request: Request) {
  try {
    const APPLICATION_PRIVATE_KEY = process.env.APPLICATION_PRIVATE_KEY;
    if (!APPLICATION_PRIVATE_KEY) {
      return NextResponse.json(
        { message: "Missing required environment variables" },
        { status: 400 },
      );
    }
    const { permissions, pci } = await request.json();

    if (!permissions) {
      return NextResponse.json(
        { message: "No permissions provided" },
        { status: 400 },
      );
    }
    if (!pci) {
      return NextResponse.json({ message: "No PCI provided" }, { status: 400 });
    }

    const playerOAddress = (permissions as GrantPermissionsReturnType)
      .signerData?.submitToAddress;
    if (!playerOAddress || !isAddress(playerOAddress))
      throw new Error("Invalid playerO address");

    const txHash = await createGame(APPLICATION_PRIVATE_KEY, playerOAddress);

    return NextResponse.json({ transactionHash: txHash });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json(
      { message: "An error occurred", error: (e as Error).message },
      { status: 500 },
    );
  }
}
