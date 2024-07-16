import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { FillUserOpParams, FillUserOpResponse, SendUserOpWithSigantureParams, SendUserOpWithSigantureResponse, UserOpBuilder } from "./UserOpBuilder";
import { createPublicClient, http } from "viem";
import { signerToSafeSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient, ENTRYPOINT_ADDRESS_V07, getUserOperationHash } from "permissionless";
import { getChainById } from "@/utils/ChainUtil";
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico";

const PIMLICO_API_KEY = process.env['NEXT_PUBLIC_PIMLICO_KEY']

export class SafeUserOpBuilder implements UserOpBuilder {

    async fillUserOp(params: FillUserOpParams): Promise<FillUserOpResponse> {

        const privateKey = generatePrivateKey()
        const signer = privateKeyToAccount(privateKey)
         
        const publicClient = createPublicClient({
            transport: http("https://rpc.ankr.com/eth_sepolia"),
        })

        const paymasterClient = createPimlicoPaymasterClient({
            transport: http("https://api.pimlico.io/v2/sepolia/rpc?apikey="+PIMLICO_API_KEY),
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        })

        const pimlicoBundlerClient = createPimlicoBundlerClient({
            transport: http("https://api.pimlico.io/v2/sepolia/rpc?apikey="+PIMLICO_API_KEY),
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        })
      
        const safeAccount = await signerToSafeSmartAccount(publicClient, {
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            signer: signer,
            safeVersion: "1.4.1",
            address: params.account
        })
        const chain = getChainById(params.chainId)
        const smartAccountClient = createSmartAccountClient({
            account: safeAccount,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain,
            bundlerTransport: http("https://api.pimlico.io/v2/sepolia/rpc?apikey="+PIMLICO_API_KEY),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation, // optional
                gasPrice: async () => (await pimlicoBundlerClient.getUserOperationGasPrice()).fast, // if using pimlico bundler
            },
        })
        const account = smartAccountClient.account
        const userOp = await smartAccountClient.prepareUserOperationRequest({
            userOperation: {
              callData: await account.encodeCallData(params.calls)
            },
            account: account
          })
        const hash = getUserOperationHash({
            userOperation: userOp,
            chainId: chain.id,
            entryPoint: ENTRYPOINT_ADDRESS_V07
        })
        return {
            userOp,
            hash
        }
    }
    sendUserOpWithSignature(params: SendUserOpWithSigantureParams): Promise<SendUserOpWithSigantureResponse>  {
        throw new Error("Method not implemented.");
    }

}