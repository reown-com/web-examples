import { signMessage } from "viem/accounts";
import { toHex, type Chain } from "viem";
import {
  Call,
  prepareCalls,
  sendPreparedCalls,
} from "./UserOpBuilderServiceUtils";

export type MultikeySigner = {
  type: "keys";
  data: {
    ids: string[];
  };
};

export async function executeActionsWithECDSAKey(args: {
  actions: Call[];
  ecdsaPrivateKey: `0x${string}`;
  chain: Chain;
  accountAddress: `0x${string}`;
  permissionsContext: string;
}): Promise<string> {
  const {
    ecdsaPrivateKey,
    actions,
    chain,
    accountAddress,
    permissionsContext,
  } = args;
  if (!permissionsContext) {
    throw new Error("No permissions available");
  }
  if (!accountAddress) {
    throw new Error("No account Address available");
  }

  const prepareCallsResponse = await prepareCalls({
    from: accountAddress,
    chainId: toHex(chain.id),
    calls: actions.map((call) => ({
      to: call.to,
      data: call.data,
      value: toHex(call.value),
    })),
    capabilities: {
      permissions: { context: permissionsContext },
    },
  });
  if (prepareCallsResponse.length !== 1 && prepareCallsResponse[0]) {
    throw new Error("Invalid response type");
  }
  const response = prepareCallsResponse[0];
  if (!response || response.preparedCalls.type !== "user-operation-v07") {
    throw new Error("Invalid response type");
  }
  const signatureRequest = response.signatureRequest;
  const dappSignature = await signMessage({
    privateKey: ecdsaPrivateKey,
    message: { raw: signatureRequest.hash },
  });

  const sendPreparedCallsResponse = await sendPreparedCalls({
    context: response.context,
    preparedCalls: response.preparedCalls,
    signature: dappSignature,
  });

  const userOpIdentifier = sendPreparedCallsResponse[0];

  return userOpIdentifier;
}
