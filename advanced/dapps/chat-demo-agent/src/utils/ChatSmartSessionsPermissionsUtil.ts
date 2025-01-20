import { grantPermissions, SmartSessionGrantPermissionsRequest, SmartSessionGrantPermissionsResponse } from "@reown/appkit-experimental/smart-session";
import { parseEther, toHex } from "viem";


const getCurrentTimestampInSeconds = () => Math.floor(Date.now() / 1000) + 20;
const PERMISSION_PERIOD =  60 * 60; //  1 hour
const ALLOWANCE_VALUE = parseEther("0.001");

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
            start: getCurrentTimestampInSeconds(),
            allowance: toHex(ALLOWANCE_VALUE),
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
      // Adding 1 hours to the current time
      expiry: getCurrentTimestampInSeconds() +  60 * 60,
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