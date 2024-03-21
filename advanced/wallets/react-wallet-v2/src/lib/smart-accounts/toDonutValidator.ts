import type { KernelValidator } from "@zerodev/sdk/types";
import type { TypedData } from "abitype";
import {
  ENTRYPOINT_ADDRESS_V06,
  type UserOperation,
  getEntryPointVersion,
  getUserOperationHash,
} from "permissionless";
import {
  SignTransactionNotSupportedBySmartAccount,
  type SmartAccountSigner,
} from "permissionless/accounts";
import type {
  EntryPoint,
  GetEntryPointVersion,
} from "permissionless/types/entrypoint";
import {
  zeroAddress,
  type Address,
  type Chain,
  type Client,
  type Hex,
  type LocalAccount,
  type Transport,
  type TypedDataDefinition,
  toHex,
  concatHex,
  pad,
} from "viem";
import { toAccount } from "viem/accounts";
import { signMessage, signTypedData } from "viem/actions";
import { getChainId } from "viem/actions";

export const getValidatorAddress = (entryPointAddress: EntryPoint) => {
  const entryPointVersion = getEntryPointVersion(entryPointAddress);
  return entryPointVersion === "v0.6" ? zeroAddress : zeroAddress;
};

export async function signerToDonutValidator<
  entryPoint extends EntryPoint,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSource extends string = "custom",
  TAddress extends Address = Address
>(
  client: Client<TTransport, TChain, undefined>,
  {
    signer,
    donutLimit,
    entryPoint: entryPointAddress = ENTRYPOINT_ADDRESS_V06 as entryPoint,
    validatorAddress,
  }: {
    signer: SmartAccountSigner<TSource, TAddress>;
    donutLimit: bigint;
    entryPoint?: entryPoint;
    validatorAddress?: Address;
  }
): Promise<KernelValidator<entryPoint, "DonutValidator">> {
  validatorAddress = validatorAddress ?? getValidatorAddress(entryPointAddress);
  // Get the private key related account
  const viemSigner: LocalAccount = {
    ...signer,
    signTransaction: (_, __) => {
      throw new SignTransactionNotSupportedBySmartAccount();
    },
  } as LocalAccount;

  // Fetch chain id
  const chainId = await getChainId(client);

  // Build the EOA Signer
  const account = toAccount({
    address: viemSigner.address,
    async signMessage({ message }) {
      return signMessage(client, { account: viemSigner, message });
    },
    async signTransaction(_, __) {
      throw new SignTransactionNotSupportedBySmartAccount();
    },
    async signTypedData<
      const TTypedData extends TypedData | Record<string, unknown>,
      TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData
    >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
      return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
        client,
        {
          account: viemSigner,
          ...typedData,
        }
      );
    },
  });

  return {
    ...account,
    address: validatorAddress,
    source: "DonutValidator",
    isPermissionValidator: false,

    async getEnableData() {
      return concatHex([
        viemSigner.address,
        pad(toHex(donutLimit), {
          size: 32,
        }),
      ]);
    },
    async getNonceKey() {
      return 0n;
    },
    // Sign a user operation
    async signUserOperation(
      userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ) {
      const hash = getUserOperationHash<entryPoint>({
        userOperation: {
          ...userOperation,
          signature: "0x",
        },
        entryPoint: entryPointAddress,
        chainId: chainId,
      });
      const signature = await signMessage(client, {
        account: viemSigner,
        message: { raw: hash },
      });
      return signature;
    },

    // Get simple dummy signature
    async getDummySignature() {
      return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },

    async isEnabled(
      _kernelAccountAddress: Address,
      _selector: Hex
    ): Promise<boolean> {
      return false;
    },
  };
}
