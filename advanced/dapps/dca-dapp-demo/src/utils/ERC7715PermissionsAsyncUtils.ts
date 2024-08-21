import { type GrantPermissionsReturnType } from "viem/experimental";
import { type UserOperation } from "permissionless/types";
import { type PublicClient } from "viem";
import { bigIntReplacer } from "./CommonUtils";
import { signMessage } from "viem/accounts";
import {
  Execution,
  getCallDataWithContext,
  getNonceWithContext,
} from "./UserOpBuilderUtils";
import { WalletConnectCosigner } from "./WalletConnectCosigner";
import {
  ENTRYPOINT_ADDRESS_V07,
  createBundlerClient,
  getUserOperationHash,
} from "permissionless";
import {
  pimlicoBundlerActions,
  pimlicoPaymasterActions,
} from "permissionless/actions/pimlico";
import { createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { createPublicClient, http, type Chain } from "viem";
import { sepolia } from "viem/chains";

function getPublicClientUrl(): string {
  const localPublicClientUrl = process.env["NEXT_PUBLIC_LOCAL_CLIENT_URL"];
  if (localPublicClientUrl) {
    return localPublicClientUrl;
  }

  return getBlockchainApiRpcUrl({
    chain: sepolia,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  });
}

function getBundlerUrl(): string {
  const localBundlerUrl = process.env["NEXT_PUBLIC_LOCAL_BUNDLER_URL"];
  if (localBundlerUrl) {
    return localBundlerUrl;
  }
  const apiKey = process.env["NEXT_PUBLIC_PIMLICO_KEY"];
  if (!apiKey) {
    throw new Error("env NEXT_PUBLIC_PIMLICO_KEY missing.");
  }

  return `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
}

function getPaymasterUrl(): string {
  const localPaymasterUrl = process.env["NEXT_PUBLIC_LOCAL_PAYMASTER_URL"];
  if (localPaymasterUrl) {
    return localPaymasterUrl;
  }
  const apiKey = process.env["NEXT_PUBLIC_PIMLICO_KEY"];
  if (!apiKey) {
    throw new Error("env NEXT_PUBLIC_PIMLICO_KEY missing.");
  }

  return `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;
}

function createClients(chain: Chain) {
  const publicClientUrl = getPublicClientUrl();
  const bundlerUrl = getBundlerUrl();
  const paymasterUrl = getPaymasterUrl();
  const publicClient = createPublicClient({
    transport: http(publicClientUrl),
    chain,
  });

  const bundlerClient = createBundlerClient({
    transport: http(bundlerUrl, {
      timeout: 300000,
    }),
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chain,
  })
    .extend(pimlicoBundlerActions(ENTRYPOINT_ADDRESS_V07))
    .extend(pimlicoPaymasterActions(ENTRYPOINT_ADDRESS_V07));

  const pimlicoPaymasterClient = createPimlicoPaymasterClient({
    transport: http(paymasterUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chain,
  });

  return { publicClient, bundlerClient, pimlicoPaymasterClient };
}

function getBlockchainApiRpcUrl({
  chain,
  projectId,
}: {
  chain: Chain;
  projectId: string;
}) {
  return `https://rpc.walletconnect.org/v1?chainId=eip155:${chain.id}&projectId=${projectId}`;
}
async function prepareUserOperationWithPermissions(
  publicClient: PublicClient,
  permissions: GrantPermissionsReturnType,
  actions: Execution[],
): Promise<UserOperation<"v0.7">> {
  if (!permissions) {
    throw new Error("No permissions available");
  }

  const { factory, factoryData, signerData, permissionsContext } = permissions;

  if (
    !signerData?.userOpBuilder ||
    !signerData.submitToAddress ||
    !permissionsContext
  ) {
    throw new Error(
      `Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`,
    );
  }

  const nonce = await getNonceWithContext(publicClient, {
    userOpBuilderAddress: signerData.userOpBuilder,
    sender: signerData.submitToAddress,
    permissionsContext: permissionsContext as `0x${string}`,
  });

  const callData = await getCallDataWithContext(publicClient, {
    userOpBuilderAddress: signerData.userOpBuilder,
    sender: signerData.submitToAddress,
    permissionsContext: permissionsContext as `0x${string}`,
    actions,
  });

  const userOp: UserOperation<"v0.7"> = {
    sender: signerData.submitToAddress,
    factory,
    factoryData: factoryData ? (factoryData as `0x${string}`) : undefined,
    nonce,
    callData,
    callGasLimit: BigInt(2000000),
    verificationGasLimit: BigInt(2000000),
    preVerificationGas: BigInt(2000000),
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0),
    signature: "0x",
  };

  return userOp;
}

async function signUserOperationWithECDSAKey(args: {
  ecdsaPrivateKey: `0x${string}`;
  userOp: UserOperation<"v0.7">;
  permissions: GrantPermissionsReturnType;
  chain: Chain;
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, userOp, permissions, chain } = args;
  if (!permissions) {
    throw new Error("No permissions available");
  }
  const { signerData } = permissions;

  if (!signerData?.userOpBuilder || !signerData.submitToAddress) {
    throw new Error(
      `Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`,
    );
  }

  const userOpHash = getUserOperationHash({
    userOperation: userOp,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chainId: chain.id,
  });

  const dappSignatureOnUserOp = await signMessage({
    privateKey: ecdsaPrivateKey,
    message: { raw: userOpHash },
  });

  return dappSignatureOnUserOp;
}

export async function executeActionsWithECDSAAndCosignerPermissions(args: {
  ecdsaPrivateKey: `0x${string}`;
  actions: Execution[];
  permissions: GrantPermissionsReturnType;
  chain: Chain;
  pci: string;
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, actions, permissions, chain, pci } = args;
  const { publicClient, bundlerClient } = createClients(chain);
  const address = permissions.signerData?.submitToAddress;
  const caip10Address = `eip155:${chain?.id}:${address}`;

  const userOp = await prepareUserOperationWithPermissions(
    publicClient,
    permissions,
    actions,
  );

  const gasPrice = await bundlerClient.getUserOperationGasPrice();
  userOp.maxFeePerGas = gasPrice.fast.maxFeePerGas;
  userOp.maxPriorityFeePerGas = gasPrice.fast.maxPriorityFeePerGas;

  const signature = await signUserOperationWithECDSAKey({
    ecdsaPrivateKey,
    userOp,
    permissions,
    chain,
  });
  userOp.signature = signature;

  const walletConnectCosigner = new WalletConnectCosigner();
  const tx = await walletConnectCosigner.coSignUserOperation(caip10Address, {
    pci,
    userOp,
  });

  const userOpReceipt = await bundlerClient.waitForUserOperationReceipt({
    hash: tx.userOperationTxHash as `0x${string}`,
  });

  if (!userOpReceipt.success) {
    throw new Error(
      `User operation failed: ${JSON.stringify(userOpReceipt, bigIntReplacer)}`,
    );
  }

  return userOpReceipt.receipt.transactionHash;
}
