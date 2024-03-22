import type { TypedData } from "viem"
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    type TypedDataDefinition,
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    pad,
    parseAbiParameters
} from "viem"
import { getChainId, signMessage, signTypedData } from "viem/actions"


import { BiconomyExecuteAbi } from "./abi/BiconomySmartAccountV3Abi"
import {
    CALLTYPE_BATCH,
    CALLTYPE_SINGLE,
    EXECTYPE_DEFAULT,
    MODE_DEFAULT,
    MODE_PAYLOAD,
    UNUSED
} from "./utils/constants"
import { ENTRYPOINT_ADDRESS_V07_TYPE, EntryPoint } from "permissionless/types/entrypoint"
import { SignTransactionNotSupportedBySmartAccount, SmartAccount, SmartAccountSigner, toSmartAccount } from "permissionless/accounts"
import { getAccountNonce, getSenderAddress, getUserOperationHash, isSmartAccountDeployed } from "permissionless"
import { Prettify } from "viem/chains"

export type BiconomySmartAccountV3<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "biconomySmartAccountV3", transport, chain>
type  TTypedData = TypedData | Record<string, unknown>
type TPrimaryType =
    | keyof TTypedData
    | "EIP712Domain" | keyof TTypedData
/**
 * The account creation ABI for Biconomy Smart Account (from the biconomy SmartAccountFactory)
 */

const createAccountAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "validationModule",
                type: "address"
            },
            {
                internalType: "bytes",
                name: "moduleInstallData",
                type: "bytes"
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256"
            }
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "address payable",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "payable",
        type: "function"
    }
] as const

/**
 * Default addresses for Biconomy Smart Account
 */
const BICONOMY_ADDRESSES: {
    K1_VALIDATOR_MODULE: Address
    ACCOUNT_V3_0_LOGIC: Address
    FACTORY_ADDRESS: Address
} = {
    K1_VALIDATOR_MODULE: "0x8f09bBea1FDd83bA68B214dC79aE73c294331733",
    ACCOUNT_V3_0_LOGIC: "0x26A1fe54198494Ba1a1aaD2D5E8255E91674C539",
    FACTORY_ADDRESS: "0x7769425B703A3c6AC8BbA33d0afd8eF94763DA2E"
}

/**
 * Get the account initialization code for Biconomy smart account with ECDSA as default authorization module
 * @param owner
 * @param index
 * @param factoryAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async ({
    owner,
    index,
    ecdsaValidatorAddress
}: {
    owner: Address
    index: bigint
    ecdsaValidatorAddress: Address
}): Promise<Hex> => {
    if (!owner) throw new Error("Owner account not found")

    // Build the validator module install data
    const moduleInstallData = encodePacked(["address"], [owner])

    // Build the account init code
    return encodeFunctionData({
        abi: createAccountAbi,
        functionName: "createAccount",
        args: [ecdsaValidatorAddress, moduleInstallData, index]
    })
}

const getAccountAddress = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>({
    client,
    factoryAddress,
    ecdsaValidatorAddress,
    entryPoint: entryPointAddress,
    owner,
    index = 0n
}: {
    client: Client<TTransport, TChain>
    factoryAddress: Address
    ecdsaValidatorAddress: Address
    owner: Address
    entryPoint: entryPoint
    index?: bigint
}): Promise<Address> => {
    const factoryData = await getAccountInitCode({
        owner,
        ecdsaValidatorAddress,
        index
    })

    // Get the sender address based on the init code
    return getSenderAddress<ENTRYPOINT_ADDRESS_V07_TYPE>(client, {
        factory: factoryAddress,
        factoryData,
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V07_TYPE
    })
}

export type SignerToBiconomySmartAccountV3Parameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TSource extends string = string,
    TAddress extends Address = Address
> = Prettify<{
    signer: SmartAccountSigner<TSource, TAddress>
    entryPoint: entryPoint
    address?: Address
    index?: bigint
    factoryAddress?: Address
    ecdsaValidatorAddress?: Address
}>

/**
 * Build a Biconomy modular smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 */
export async function signerToBiconomySmartAccountV3<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = string,
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        address,
        entryPoint: entryPointAddress,
        index = 0n,
        factoryAddress = BICONOMY_ADDRESSES.FACTORY_ADDRESS,
        ecdsaValidatorAddress = BICONOMY_ADDRESSES.K1_VALIDATOR_MODULE
    }: SignerToBiconomySmartAccountV3Parameters<entryPoint, TSource, TAddress>
): Promise<BiconomySmartAccountV3<entryPoint, TTransport, TChain>> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
        }
    } as LocalAccount

    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            owner: viemSigner.address,
            index,
            ecdsaValidatorAddress
        })

    // Fetch account address and chain id
    const [accountAddress, chainId] = await Promise.all([
        address ??
            getAccountAddress<entryPoint, TTransport, TChain>({
                client,
                factoryAddress,
                ecdsaValidatorAddress,
                entryPoint: entryPointAddress,
                owner: viemSigner.address,
                index
            }),
        getChainId(client)
    ])

    if (!accountAddress) throw new Error("Account address not found")

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        accountAddress
    )

    return toSmartAccount({
        address: accountAddress,
        async signMessage({ message }) {
            let signature: Hex = await signMessage(client, {
                account: viemSigner,
                message
            })
            const potentiallyIncorrectV = parseInt(signature.slice(-2), 16)
            if (![27, 28].includes(potentiallyIncorrectV)) {
                const correctV = potentiallyIncorrectV + 27
                signature = (signature.slice(0, -2) +
                    correctV.toString(16)) as Hex
            }
            return encodeAbiParameters(
                [{ type: "bytes" }, { type: "address" }],
                [signature, ecdsaValidatorAddress]
            )
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount()
        },
        // @ts-ignore
        async signTypedData<TTypedData,TPrimaryType>(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            let signature: Hex = await signTypedData<
             // @ts-ignore
                TTypedData,
                TPrimaryType,
                TChain,
                undefined
            >(client, {
                account: viemSigner,
                ...typedData
            })
            const potentiallyIncorrectV = parseInt(signature.slice(-2), 16)
            if (![27, 28].includes(potentiallyIncorrectV)) {
                const correctV = potentiallyIncorrectV + 27
                signature = (signature.slice(0, -2) +
                    correctV.toString(16)) as Hex
            }
            return encodeAbiParameters(
                [{ type: "bytes" }, { type: "address" }],
                [signature, ecdsaValidatorAddress]
            )
        },
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPointAddress,
        source: "biconomySmartAccountV3",

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPointAddress,
                // Review
                key: BigInt(pad(ecdsaValidatorAddress, { size: 24 }))
            })
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x"
                },
                entryPoint: entryPointAddress,
                chainId: chainId
            })
            console.log('userOpHash');
            
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })

        
            return signature
            // userOp signature is encoded module signature + module address
            const signatureWithModuleAddress = encodeAbiParameters(
                parseAbiParameters("bytes, address"),
                [signature, ecdsaValidatorAddress]
            )
            return signatureWithModuleAddress
        },

        async getFactory() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined

            return factoryAddress
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return undefined
            return generateInitCode()
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x"

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                accountAddress
            )

            if (smartAccountDeployed) return "0x"

            return concatHex([factoryAddress, await generateInitCode()])
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error("Doesn't support account deployment")
        },

        // Encode a call
        async encodeCallData(args) {
            if (Array.isArray(args)) {
                // Encode a batched call
                const argsArray = args as {
                    to: Address
                    value: bigint
                    data: Hex
                }[]

                console.log("argsArray", argsArray)

                const mode = concatHex([
                    EXECTYPE_DEFAULT,
                    CALLTYPE_BATCH,
                    UNUSED,
                    MODE_DEFAULT,
                    MODE_PAYLOAD
                ])

                return encodeFunctionData({
                    abi: BiconomyExecuteAbi,
                    functionName: "execute",
                    args: [
                        mode,
                        "0x" // abi.encode(executions) // TODO for args
                    ]
                })
            }
            const { to, value, data } = args as {
                to: Address
                value: bigint
                data: Hex
            }

            const mode = concatHex([
                EXECTYPE_DEFAULT,
                CALLTYPE_SINGLE,
                UNUSED,
                MODE_DEFAULT,
                MODE_PAYLOAD
            ])
            console.log('ENCODE PACKED',{ to, value, data });
            
            const executionCalldata = encodePacked(
                ["address", "uint256", "bytes"],
                [to, value, data || '0x00']
            )
            // Encode a simple call
            return encodeFunctionData({
                abi: BiconomyExecuteAbi,
                functionName: "execute",
                args: [mode, executionCalldata]
            })
        },

        // Get simple dummy signature for ECDSA module authorization
        async getDummySignature(_userOperation) {
            return `0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b`
        }
    })
}
