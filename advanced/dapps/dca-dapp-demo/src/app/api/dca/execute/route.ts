import {
  abi as donutContractAbi,
  address as donutContractAddress,
} from "@/utils/DonutContract";
import { executeActionsWithECDSAAndCosignerPermissions } from "@/utils/ERC7715PermissionsAsyncUtils";
import { CoSignerApiError } from "@/utils/WalletConnectCosignerUtils";
import { NextResponse } from "next/server";
import { encodeFunctionData, parseEther } from "viem";
import { GrantPermissionsReturnType } from "viem/experimental";
import { sepolia } from "viem/chains";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";

export async function POST(request: Request) {
  const {
    strategy,
    permissions,
    pci,
  }: {
    strategy: DCAFormSchemaType;
    permissions: GrantPermissionsReturnType;
    pci: string;
  } = await request.json();
  const APPLICATION_PRIVATE_KEY = process.env.APPLICATION_PRIVATE_KEY as `0x${string}`;

  try {
    if (!APPLICATION_PRIVATE_KEY) {
      return NextResponse.json(
        { message: "No application signer" },
        { status: 400 },
      );
    }
    if (!strategy) {
      return NextResponse.json(
        { message: "No strategy provided" },
        { status: 400 },
      );
    }
    if (!permissions) {
      return NextResponse.json(
        { message: "No permissions provided" },
        { status: 400 },
      );
    }
    if (!pci) {
      return NextResponse.json({ message: "No pci provided" }, { status: 400 });
    }

    const purchaseDonutCallData = encodeFunctionData({
      abi: donutContractAbi,
      functionName: "purchase",
      args: [1],
    });
    const purchaseDonutCallDataExecution = [
      {
        to: donutContractAddress as `0x${string}`,
        value: parseEther("0.0001"),
        data: purchaseDonutCallData,
      },
    ];
    await executeActionsWithECDSAAndCosignerPermissions({
      ecdsaPrivateKey: APPLICATION_PRIVATE_KEY,
      pci,
      permissions,
      chain: sepolia,
      actions: purchaseDonutCallDataExecution,
    });

    return NextResponse.json(
      { message: "Asset sucessfully purchased." },
      { status: 200 },
    );
  } catch (e) {
    console.log("Error interacting with contract:", e);
    let errorMessage = "Error making move";
    if (e instanceof CoSignerApiError) {
      errorMessage = e.message;
    } else if (typeof e === "string") {
      errorMessage = e;
    } else {
      try {
        errorMessage = JSON.stringify(e, null, 2);
      } catch {
        errorMessage = Object.prototype.toString.call(e);
      }
    }
    console.log("Error message:", errorMessage);

    return NextResponse.json(
      { message: errorMessage, error: errorMessage },
      { status: 500 },
    );
  }
}
