import { toHex } from "viem";
import { useDcaApplicationContext } from "../context/DcaApplicationContextProvider";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { getSampleAsyncDCAPermissions } from "@/utils/DCAUtils";
import {
  grantPermissions,
  SmartSessionGrantPermissionsRequest,
} from "@reown/appkit-experimental/smart-session";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";

export function useDCA() {
  const { setSmartSession } = useDcaApplicationContext();
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  async function createNewDCAStrategy(data: DCAFormSchemaType) {
    if (!chainId || !address) {
      throw new Error("Wallet not connected");
    }

    const getDappKeyResponse = await fetch("/api/signer", {
      method: "GET",
    });
    const dappSignerData = await getDappKeyResponse.json();
    const dAppECDSAPublicKey = dappSignerData.key;
    const sampleDCAPermissions = getSampleAsyncDCAPermissions(data);
    const grantDCAPermissions: SmartSessionGrantPermissionsRequest = {
      // Adding 24 hours to the current time
      expiry: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
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
      permissions: sampleDCAPermissions["permissions"],
      policies: sampleDCAPermissions["policies"] || [],
    };
    const approvedPermissions = await grantPermissions(grantDCAPermissions);

    setSmartSession({
      grantedPermissions: approvedPermissions,
      dcaStrategy: data,
    });
  }

  return {
    createNewDCAStrategy,
  };
}
