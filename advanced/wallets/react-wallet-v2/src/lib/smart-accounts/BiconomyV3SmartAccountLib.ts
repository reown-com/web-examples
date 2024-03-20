import { ENTRYPOINT_ADDRESS_V07, SmartAccountClientConfig, getAccountNonce, getEntryPointVersion, getSenderAddress, getUserOperationHash, isSmartAccountDeployed } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SignTransactionNotSupportedBySmartAccount, SmartAccount, SmartAccountSigner, toSmartAccount } from 'permissionless/accounts'
import { ENTRYPOINT_ADDRESS_V07_TYPE, EntryPoint, Prettify } from 'permissionless/types'
import { Address, Chain, Client, Hex, LocalAccount, Transport, TypedData, TypedDataDefinition, concatHex, encodeAbiParameters, encodeFunctionData, encodePacked, pad, parseAbiParameters } from 'viem'
import { getChainId, signMessage, signTypedData } from 'viem/actions'
export const BiconomyExecuteAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "dest",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256"
            },
            {
                internalType: "bytes",
                name: "func",
                type: "bytes"
            }
        ],
        name: "execute_ncC",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "dest",
                type: "address[]"
            },
            {
                internalType: "uint256[]",
                name: "value",
                type: "uint256[]"
            },
            {
                internalType: "bytes[]",
                name: "func",
                type: "bytes[]"
            }
        ],
        name: "executeBatch_y6U",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const

type BiconomySmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "biconomySmartAccount", transport, chain>


// define mode and exec type enums
const CALLTYPE_SINGLE = "0x00" // 1 byte
const CALLTYPE_BATCH = "0x01" // 1 byte
const EXECTYPE_DEFAULT = "0x00" // 1 byte
const MODE_DEFAULT = "0x00000000" // 4 bytes
const UNUSED = "0x00000000" // 4 bytes
const MODE_PAYLOAD = "0x00000000000000000000000000000000000000000000" // 22 bytes

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
  R1_VALIDATOR_MODULE: Address
  ACCOUNT_V3_0_LOGIC: Address
  FACTORY_ADDRESS: Address
} = {
  R1_VALIDATOR_MODULE: "0xA957bb79575a1cf17722Cb57057bc42363FA63C9",
  ACCOUNT_V3_0_LOGIC: "0xCA8C0FE82e6572453fc86de43738Fa0d3379B1E1",
  FACTORY_ADDRESS: "0x710a4556523120e536e3755eF8dEAd420E2FC0E6"
}


const BICONOMY_PROXY_CREATION_CODE =
    "0x6080346100aa57601f61012038819003918201601f19168301916001600160401b038311848410176100af578084926020946040528339810103126100aa57516001600160a01b0381168082036100aa5715610065573055604051605a90816100c68239f35b60405162461bcd60e51b815260206004820152601e60248201527f496e76616c696420696d706c656d656e746174696f6e206164647265737300006044820152606490fd5b600080fd5b634e487b7160e01b600052604160045260246000fdfe608060405230546000808092368280378136915af43d82803e156020573d90f35b3d90fdfea2646970667358221220a03b18dce0be0b4c9afe58a9eb85c35205e2cf087da098bbf1d23945bf89496064736f6c63430008110033"


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
  const entryPointVersion = getEntryPointVersion(entryPointAddress)

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


export type SignerToBiconomySmartAccountParameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TSource extends string = string,
    TAddress extends Address = Address
> = Prettify<{
    signer: SmartAccountSigner<TSource, TAddress>
    entryPoint: entryPoint
    address?: Address
    index?: bigint
    factoryAddress?: Address
    accountLogicAddress?: Address
    fallbackHandlerAddress?: Address
    ecdsaValidatorAddress?: Address
}>


type TTypedData = TypedData | Record<string, unknown>
type TPrimaryType = keyof TTypedData | "EIP712Domain" 

async function signerToBiconomySmartAccount<
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
        accountLogicAddress = BICONOMY_ADDRESSES.ACCOUNT_V3_0_LOGIC,
        ecdsaValidatorAddress = BICONOMY_ADDRESSES.R1_VALIDATOR_MODULE
    }: SignerToBiconomySmartAccountParameters<entryPoint, TSource, TAddress>
): Promise<BiconomySmartAccount<entryPoint, TTransport, TChain>> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress)

    if (entryPointVersion !== "v0.7") {
        throw new Error("Only EntryPoint 0.7 is supported")
    }

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
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPointAddress,
        source: "biconomySmartAccount",
        
        // @ts-ignore
        async signTypedData(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            let signature: Hex = await signTypedData<
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
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash }
            })
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

                const mode = concatHex([
                    EXECTYPE_DEFAULT,
                    CALLTYPE_BATCH,
                    UNUSED,
                    MODE_DEFAULT,
                    MODE_PAYLOAD
                ])

                return encodeFunctionData({
                    abi: BiconomyExecuteAbi,
                    // @ts-ignore
                    functionName: "execute",
                    args: [
                        mode,
                         // @ts-ignore
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

            const executionCalldata = encodePacked(
                ["address", "uint256", "bytes"],
                [to, value, data]
            )
            // Encode a simple call
            return encodeFunctionData({
                abi: BiconomyExecuteAbi,
                 // @ts-ignore
                functionName: "execute",
                 // @ts-ignore
                args: [mode, executionCalldata]
            })
        },

        // Get simple dummy signature for ECDSA module authorization
        async getDummySignature(_userOperation) {
            return `0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b`
        }
    })
}


export class BiconomyV3SmartAccountLib extends SmartAccountLib {

  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {

    if (this.entryPoint !== ENTRYPOINT_ADDRESS_V07) {
      throw new Error('Only entrypoint V7 is supported')
    }
    const biconomyV3Account = await signerToBiconomySmartAccount(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer,
    })

    return {
      account: biconomyV3Account as SmartAccount<EntryPoint>,
      entryPoint: this.entryPoint,
      chain: this.chain,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
  }
}
