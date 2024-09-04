import {
  decodeUncompressedPublicKey,
  encodePublicKeyToDID,
  hexStringToBase64,
} from "../utils/EncodingUtils";
import { walletActionsErc7715 } from "viem/experimental";
import { createPublicClient, custom } from "viem";
import { WalletConnectCosigner } from "../utils/WalletConnectCosignerUtils";
import { useDcaApplicationContext } from "../context/DcaApplicationContextProvider";
import { DCAFormSchemaType } from "@/schema/DCAFormSchema";
import { getSampleAsyncDCAPermissions } from "@/utils/DCAUtils";

export function useDCA() {
  const {
    setGrantedPermissions,
    setWCCosignerData,
    addDcaStrategy,
    address,
    chain,
    provider,
  } = useDcaApplicationContext();

  async function createNewDCAStrategy(data: DCAFormSchemaType) {
    if (!chain || !address || !provider) {
      throw new Error("Wallet not connected");
    }
    const caip10Address = `eip155:${chain?.id}:${address}`;

    const getDappKeyResponse = await fetch("/api/signer", {
      method: "GET",
    });
    const dappSignerData = await getDappKeyResponse.json();
    const dAppECDSAPublicKey = dappSignerData.key;
    const walletConnectCosigner = new WalletConnectCosigner();
    const addPermissionResponse = await walletConnectCosigner.addPermission(
      caip10Address,
      {
        permissionType: "donut-purchase",
        data: "",
        onChainValidated: false,
        required: true,
      },
    );
    const cosignerPublicKey = decodeUncompressedPublicKey(
      addPermissionResponse.key,
    );
    const dAppSecp256k1DID = encodePublicKeyToDID(
      dAppECDSAPublicKey,
      "secp256k1",
    );
    const coSignerSecp256k1DID = encodePublicKeyToDID(
      cosignerPublicKey,
      "secp256k1",
    );

    const publicClient = createPublicClient({
      chain,
      transport: custom(provider),
    }).extend(walletActionsErc7715());

    const samplePermissions = getSampleAsyncDCAPermissions([
      coSignerSecp256k1DID,
      dAppSecp256k1DID,
    ]);

    const approvedPermissions =
      await publicClient.grantPermissions(samplePermissions);
    if (!approvedPermissions) {
      throw new Error("Failed to obtain permissions");
    }

    await walletConnectCosigner.updatePermissionsContext(caip10Address, {
      pci: addPermissionResponse.pci,
      context: {
        expiry: approvedPermissions.expiry,
        signer: {
          type: "donut-purchase",
          data: {
            ids: [
              addPermissionResponse.key,
              hexStringToBase64(dAppECDSAPublicKey),
            ],
          },
        },
        signerData: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          userOpBuilder: approvedPermissions.signerData?.userOpBuilder!,
        },
        permissionsContext: approvedPermissions.permissionsContext,
        factory: approvedPermissions.factory || "",
        factoryData: approvedPermissions.factoryData || "",
      },
    });

    // Temp: Save the DCA strategy to local storage
    addDcaStrategy(data);
    setWCCosignerData(addPermissionResponse);
    setGrantedPermissions(approvedPermissions);
  }

  return {
    createNewDCAStrategy,
  };
}
