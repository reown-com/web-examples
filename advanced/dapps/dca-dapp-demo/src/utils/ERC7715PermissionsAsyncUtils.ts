import { type GrantPermissionsReturnType } from "viem/experimental";
import { bigIntReplacer } from "./CommonUtils";
import { signMessage } from "viem/accounts";
import { type Chain } from "viem";
import { WalletConnectCosigner } from "./WalletConnectCosignerUtils";
import {
  buildUserOp,
  type Call,
  type FillUserOpResponse,
} from "./UserOpBuilderServiceUtils";

export type MultikeySigner = {
  type: "keys";
  data: {
    ids: string[];
  };
};

async function prepareUserOperationWithPermissions(args: {
  actions: Call[];
  chain: Chain;
  permissions: GrantPermissionsReturnType;
}): Promise<FillUserOpResponse> {
  const { actions, chain, permissions } = args;
  if (!permissions) {
    throw new Error("No permissions available");
  }
  const { signerData, permissionsContext } = permissions;

  if (
    !signerData?.userOpBuilder ||
    !signerData.submitToAddress ||
    !permissionsContext
  ) {
    throw new Error(
      `Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`,
    );
  }

  const filledUserOp = await buildUserOp({
    account: signerData.submitToAddress,
    chainId: chain.id,
    calls: actions,
    capabilities: {
      permissions: { context: permissionsContext as `0x${string}` },
    },
  });

  return filledUserOp;
}

async function signUserOperationWithECDSAKey(args: {
  ecdsaPrivateKey: `0x${string}`;
  userOpHash: `0x${string}`;
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, userOpHash } = args;

  const dappSignatureOnUserOp = await signMessage({
    privateKey: ecdsaPrivateKey,
    message: { raw: userOpHash },
  });

  return dappSignatureOnUserOp;
}

export async function executeActionsWithECDSAAndCosignerPermissions(args: {
  actions: Call[];
  ecdsaPrivateKey: `0x${string}`;
  chain: Chain;
  permissions: GrantPermissionsReturnType;
  pci: string;
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, actions, chain, permissions, pci } = args;
  const accountAddress = permissions?.signerData?.submitToAddress;
  if (!accountAddress) {
    throw new Error(`Unable to get account details from granted permission`);
  }

  if (!pci) {
    throw new Error("No WC_COSIGNER PCI data available");
  }
  const caip10Address = `eip155:${chain?.id}:${accountAddress}`;
  const filledUserOp = await prepareUserOperationWithPermissions({
    actions,
    chain,
    permissions,
  });
  const userOp = filledUserOp.userOp;

  const dappSignature = await signUserOperationWithECDSAKey({
    ecdsaPrivateKey,
    userOpHash: filledUserOp.hash,
  });

  userOp.signature = dappSignature;
  const walletConnectCosigner = new WalletConnectCosigner();
  const cosignResponse = await walletConnectCosigner.coSignUserOperation(
    caip10Address,
    {
      pci,
      userOp: {
        ...userOp,
        callData: userOp.callData,
        callGasLimit: BigInt(userOp.callGasLimit),
        nonce: BigInt(userOp.nonce),
        preVerificationGas: BigInt(userOp.preVerificationGas),
        verificationGasLimit: BigInt(userOp.verificationGasLimit),
        sender: userOp.sender,
        signature: userOp.signature,
        maxFeePerGas: BigInt(userOp.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
      },
    },
  );
  console.log("Cosign response:", cosignResponse);
  return cosignResponse.receipt as `0x${string}`;
}
