import {
  abi as donutContractAbi,
  address as donutContractAddress,
} from "@/utils/DonutContract";
import { executeActionsWithECDSAKey } from "@/utils/ERC7715PermissionsAsyncUtils";
import { NextResponse } from "next/server";
import { encodeFunctionData, parseEther } from "viem";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";
import { getChain } from "@/utils/ChainsUtil";

// Helper function to validate request inputs
const validateRequestInputs = (
  strategy: DCAFormSchemaType,
  permissions: SmartSessionGrantPermissionsResponse,
  privateKey: string | undefined,
) => {
  if (!privateKey) throw new Error("No application signer");
  if (!strategy) throw new Error("No strategy provided");
  if (!permissions || !permissions.context || !permissions.address)
    throw new Error("No permissions provided");
};

// Helper function to validate chain ID and get chain object
const getValidatedChain = (chainIdHex: string) => {
  const chainId = parseInt(chainIdHex, 16);
  if (!chainId)
    throw new Error("Chain ID not available in granted permissions");

  const chain = getChain(chainId);
  if (!chain) throw new Error("Unknown chainId");
  return chain;
};

// Helper function to construct purchase call data
const getPurchaseDonutCallData = () =>
  encodeFunctionData({
    abi: donutContractAbi,
    functionName: "purchase",
    args: [1],
  });

// Main handler function for POST request
export async function POST(request: Request) {
  try {
    const {
      strategy,
      permissions,
    }: {
      strategy: DCAFormSchemaType;
      permissions: SmartSessionGrantPermissionsResponse;
    } = await request.json();
    const APPLICATION_PRIVATE_KEY = process.env
      .APPLICATION_PRIVATE_KEY as `0x${string}`;
    // Validate inputs and get chain
    validateRequestInputs(strategy, permissions, APPLICATION_PRIVATE_KEY);

    const chain = getValidatedChain(permissions.chainId);

    // Create purchase call data
    const purchaseDonutCallData = getPurchaseDonutCallData();
    const purchaseDonutCallDataExecution = [
      {
        to: donutContractAddress as `0x${string}`,
        value: parseEther("0.0001"),
        data: purchaseDonutCallData,
      },
    ];
    // Execute the actions using ECDSA key
    await executeActionsWithECDSAKey({
      ecdsaPrivateKey: APPLICATION_PRIVATE_KEY,
      actions: purchaseDonutCallDataExecution,
      chain,
      accountAddress: permissions.address,
      permissionsContext: permissions.context,
    });

    return NextResponse.json(
      { message: "Asset successfully purchased." },
      { status: 200 },
    );
  } catch (error) {
    return handleError(error);
  }
}

// Helper function to handle and log errors
const handleError = (error: unknown) => {
  const errorMessage = getErrorMessage(error);
  console.error("Error interacting with contract:", errorMessage);
  return NextResponse.json(
    { message: errorMessage, error: errorMessage },
    { status: 500 },
  );
};

// Helper function to extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return Object.prototype.toString.call(error);
  }
};
