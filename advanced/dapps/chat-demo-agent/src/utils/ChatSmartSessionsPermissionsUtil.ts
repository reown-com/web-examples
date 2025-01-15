import { grantPermissions, SmartSessionGrantPermissionsRequest, SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";
import { toHex } from "viem";


const getCurrentTimestampInSeconds = () => Math.floor(Date.now() / 1000);
const PERMISSION_PERIOD = 60000; // Define period as a constant
const ALLOWANCE_VALUE = '0x1000000000000000000';

export function getChatAgentPermissions(): Omit<
    SmartSessionGrantPermissionsRequest,
    "signer" | "chainId" | "address" | "expiry"
  > {
    return {
      permissions: [
        {
          type: "native-token-recurring-allowance",
          data: {
            period: PERMISSION_PERIOD,
            start: getCurrentTimestampInSeconds() + 60 * 60,
            allowance: ALLOWANCE_VALUE,
          },
        },
      ],
      policies: [],
    };
  }
  // Method to get required permissions
  export const getRequiredPermissions = async (chainId: number, address: `0x${string}`): Promise<SmartSessionGrantPermissionsResponse> => {
    const getDappKeyResponse = await fetch("/api/signer", {
      method: "GET",
    });
    const dappSignerData = await getDappKeyResponse.json();
    const dAppECDSAPublicKey = dappSignerData.key;

    const chatAgentPermission = getChatAgentPermissions();
    const smartSessionChatAgentPermissions: SmartSessionGrantPermissionsRequest = {
      expiry: getCurrentTimestampInSeconds() + 24 * 60 * 60,
      chainId: toHex(chainId),
      address: address as `0x${string}`,
      signer: {
        type: "keys",
        data: {
          keys: [
            {
              type: "secp256k1",
              publicKey: dAppECDSAPublicKey,
            },
          ],
        },
      },
      permissions: chatAgentPermission["permissions"],
      policies: chatAgentPermission["policies"] || [],
    };
    const approvedPermissions = await grantPermissions(smartSessionChatAgentPermissions);

    return approvedPermissions;
  };