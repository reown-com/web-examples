import { type GrantPermissionsReturnType } from "viem/experimental";
import { bigIntReplacer } from "./CommonUtils";
import { signMessage } from "viem/accounts";
import { type Chain } from "viem";
import {
  buildUserOp,
  sendUserOp,
  type Call,
} from "./UserOpBuilderServiceUtils";

export type MultikeySigner = {
  type: "keys";
  data: {
    ids: string[];
  };
};

export async function executeActionsWithECDSAAndCosignerPermissions(args: {
  actions: Call[]
  ecdsaPrivateKey: `0x${string}`
  chain: Chain
  permissions: GrantPermissionsReturnType
  pci: string
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, actions, chain, permissions, pci } = args
  if (!pci) {
    throw new Error('No WC_COSIGNER PCI data available')
  }
  if (!permissions) {
    throw new Error('No permissions available')
  }
  const { signerData, permissionsContext } = permissions

  if (!signerData?.submitToAddress || !permissionsContext) {
    throw new Error(`Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`)
  }
  const accountAddress = signerData.submitToAddress

  const filledUserOp = await buildUserOp({
    account: accountAddress,
    chainId: chain.id,
    calls: actions,
    capabilities: {
      permissions: { context: permissionsContext as `0x${string}` }
    }
  })

  const userOp = filledUserOp.userOp

  const dappSignature = await signMessage({
    privateKey: ecdsaPrivateKey,
    message: { raw: filledUserOp.hash }
  })
  userOp.signature = dappSignature

  const sendUserOpResponse = await sendUserOp({
    userOp,
    pci,
    chainId: chain.id,
    permissionsContext: permissionsContext as `0x${string}`
  })

  return sendUserOpResponse.userOpId
}
