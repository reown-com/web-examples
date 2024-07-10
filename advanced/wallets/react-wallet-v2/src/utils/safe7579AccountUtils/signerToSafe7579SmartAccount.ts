import type { PublicActions, PublicRpcSchema, SignableMessage, TypedData } from 'viem'
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
  zeroAddress,
  keccak256,
  stringToBytes,
  publicActions,
  hashTypedData,
  hashMessage,
  toBytes
} from 'viem'
import { getChainId, signMessage, signTypedData } from 'viem/actions'
import { ENTRYPOINT_ADDRESS_V07_TYPE, EntryPoint } from 'permissionless/types/entrypoint'
import {
  SignTransactionNotSupportedBySmartAccount,
  SmartAccount,
  SmartAccountSigner,
  toSmartAccount
} from 'permissionless/accounts'
import { getAccountNonce, getUserOperationHash, isSmartAccountDeployed } from 'permissionless'
import { Prettify } from 'viem/chains'
import {
  LAUNCHPAD_ADDRESS,
  SAFE_7579_ADDRESS,
  SAFE_ACCOUNT_FACTORY_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  VALIDATOR_ADDRESS
} from './constants'
import { CALL_TYPE, Execution, encodeUserOpCallData } from './userop'
import {
  hashAbi,
  initSafe7579Abi,
  preValidationSetupAbi,
  predictSafeAddressAbi,
  setupSafeAbi
} from './abis/Launchpad'
import { createProxyWithNonceAbi, proxyCreationCodeAbi } from './abis/AccountFactory'
import { executeAbi } from './abis/Account'
import { PERMISSION_VALIDATOR_ADDRESS } from '../permissionValidatorUtils/constants'

export type Safe7579SmartAccount<
  entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, 'safe7579SmartAccount', transport, chain>
type TTypedData = TypedData | Record<string, unknown>
type TPrimaryType = keyof TTypedData | 'EIP712Domain' | keyof TTypedData
/**
 * The account creation ABI for Safe7579 Smart Account
 */

type InitialModule = {
  module: Address
  initData: Hex
}

export function getSafe7579InitialValidators(): InitialModule[] {
  const initialValidatorModuleAddress: Address[] = [VALIDATOR_ADDRESS, PERMISSION_VALIDATOR_ADDRESS]
  const initialValidators: InitialModule[] = initialValidatorModuleAddress.map(
    validatorModuleAddress => {
      return {
        module: validatorModuleAddress,
        initData: '0x'
      }
    }
  )
  return initialValidators
}

export const getSafe7579InitData = (
  owner: Address,
  initialValidators: InitialModule[],
  initialExecutions: Execution | Execution[]
) => {
  if (!Array.isArray(initialExecutions)) initialExecutions = [initialExecutions]
  return {
    singleton: SAFE_SINGLETON_ADDRESS,
    owners: [owner],
    threshold: BigInt(1),
    setupTo: LAUNCHPAD_ADDRESS,
    setupData: encodeFunctionData({
      abi: initSafe7579Abi,
      functionName: 'initSafe7579',
      args: [
        SAFE_7579_ADDRESS,
        [], // executors
        [], // fallbacks
        [], // hooks
        [], // attesters
        0 // threshold
      ]
    }),
    safe7579: SAFE_7579_ADDRESS,
    validators: initialValidators,
    callData: encodeUserOpCallData({
      actions: initialExecutions
    })
  }
}
/**
 * Get the account initialization code for Safe7579 smart account default authorization module
 * @param owner
 * @param index
 * @param initialValidatorAddress
 */
const getAccountInitCode = async <
  entryPoint extends EntryPoint,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>({
  client,
  owner,
  index,
  initialValidatorAddress
}: {
  client: Client<TTransport, TChain>
  owner: Address
  index: bigint
  initialValidatorAddress: Address
}): Promise<Hex> => {
  if (!owner) throw new Error('Owner account not found')
  const initialValidators = getSafe7579InitialValidators()
  const dummyExecution = [
    {
      to: zeroAddress as Address,
      value: BigInt('0'),
      data: '0x' as Hex
    }
  ]
  const initData = getSafe7579InitData(owner, initialValidators, dummyExecution)
  const publicClient = client.extend(publicActions)
  const initHash = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: hashAbi,
    functionName: 'hash',
    args: [initData]
  })) as Hex
  const factoryInitializer = encodeFunctionData({
    abi: preValidationSetupAbi,
    functionName: 'preValidationSetup',
    args: [initHash, zeroAddress, '']
  })

  const salt = keccak256(stringToBytes(index.toString()))

  const initCode = encodeFunctionData({
    abi: createProxyWithNonceAbi,
    functionName: 'createProxyWithNonce',
    args: [LAUNCHPAD_ADDRESS, factoryInitializer, BigInt(salt)]
  })
  return initCode
}

const getAccountAddress = async <
  entryPoint extends EntryPoint,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>({
  client,
  factoryAddress,
  initialValidatorAddress,
  entryPoint: entryPointAddress,
  owner,
  index = 0n
}: {
  client: Client<TTransport, TChain>
  factoryAddress: Address
  initialValidatorAddress: Address
  owner: Address
  entryPoint: entryPoint
  index?: bigint
}): Promise<Address> => {
  const salt = keccak256(stringToBytes(index.toString()))
  const initialValidators = getSafe7579InitialValidators()
  const publicClient = client.extend(publicActions)
  const dummyExecution = [
    {
      to: zeroAddress as Address,
      value: BigInt('0'),
      data: '0x' as Hex
    }
  ]
  const initData = getSafe7579InitData(owner, initialValidators, dummyExecution)
  const initHash = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: hashAbi,
    functionName: 'hash',
    args: [initData]
  })) as Hex
  const factoryInitializer = encodeFunctionData({
    abi: preValidationSetupAbi,
    functionName: 'preValidationSetup',
    args: [initHash, zeroAddress, '']
  })

  const safeProxyCreationCode = (await publicClient.readContract({
    address: factoryAddress, // SAFE_ACCOUNT_FACTORY_ADDRESS,
    abi: proxyCreationCodeAbi,
    functionName: 'proxyCreationCode',
    args: []
  })) as Hex

  const address = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: predictSafeAddressAbi,
    functionName: 'predictSafeAddress',
    args: [
      LAUNCHPAD_ADDRESS,
      factoryAddress, // SAFE_ACCOUNT_FACTORY_ADDRESS,
      safeProxyCreationCode,
      salt,
      factoryInitializer
    ]
  })) as Address
  // Get the sender address based on the init code
  return address
}

const adjustVInSignature = (
  signingMethod: 'eth_sign' | 'eth_signTypedData',
  signature: string
): Hex => {
  const ETHEREUM_V_VALUES = [0, 1, 27, 28]
  const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27
  let signatureV = parseInt(signature.slice(-2), 16)
  if (!ETHEREUM_V_VALUES.includes(signatureV)) {
    throw new Error('Invalid signature')
  }
  if (signingMethod === 'eth_sign') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
    signatureV += 4
  }
  if (signingMethod === 'eth_signTypedData') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
  }
  return (signature.slice(0, -2) + signatureV.toString(16)) as Hex
}

const generateSafeMessageMessage = <
  TTypedData extends TypedData | { [key: string]: unknown },
  TPrimaryType extends keyof TTypedData | 'EIP712Domain' = keyof TTypedData
>(
  message: SignableMessage | TypedDataDefinition<TTypedData, TPrimaryType>
): Hex => {
  const signableMessage = message as SignableMessage

  if (typeof signableMessage === 'string' || signableMessage.raw) {
    return hashMessage(signableMessage)
  }

  return hashTypedData(message as TypedDataDefinition<TTypedData, TPrimaryType>)
}

export type SignerToSafe7579SmartAccountParameters<
  entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
  TSource extends string = string,
  TAddress extends Address = Address
> = Prettify<{
  signer: SmartAccountSigner<TSource, TAddress>
  entryPoint: entryPoint
  index?: bigint
  factoryAddress?: Address
  initialValidatorAddress?: Address
}>

/**
 * Build a Safe7579 modular smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param signer
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param initialValidatorAddress
 */
export async function signerToSafe7579SmartAccount<
  entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TSource extends string = string,
  TAddress extends Address = Address
>(
  client: Client<TTransport, TChain, undefined, PublicRpcSchema, PublicActions>,
  {
    signer,
    entryPoint: entryPointAddress,
    index = 0n,
    factoryAddress = SAFE_ACCOUNT_FACTORY_ADDRESS,
    initialValidatorAddress = VALIDATOR_ADDRESS
  }: SignerToSafe7579SmartAccountParameters<entryPoint, TSource, TAddress>
): Promise<Safe7579SmartAccount<entryPoint, TTransport, TChain>> {
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
      client,
      owner: viemSigner.address,
      index,
      initialValidatorAddress
    })

  // Fetch account address and chain id
  const [accountAddress, chainId] = await Promise.all([
    getAccountAddress<entryPoint, TTransport, TChain>({
      client,
      factoryAddress,
      initialValidatorAddress,
      entryPoint: entryPointAddress,
      owner: viemSigner.address,
      index
    }),
    getChainId(client)
  ])

  if (!accountAddress) throw new Error('Account address not found')

  let smartAccountDeployed = await isSmartAccountDeployed(client, accountAddress)

  return toSmartAccount({
    address: accountAddress,
    client: client,
    // publicKey: accountAddress,
    entryPoint: entryPointAddress,
    source: 'safe7579SmartAccount',

    async signMessage({ message }) {
      const messageHash = hashTypedData({
        domain: {
          chainId: chainId,
          verifyingContract: accountAddress
        },
        types: {
          SafeMessage: [{ name: 'message', type: 'bytes' }]
        },
        primaryType: 'SafeMessage',
        message: {
          message: generateSafeMessageMessage(message)
        }
      })

      return adjustVInSignature(
        'eth_sign',
        await signMessage(client, {
          account: viemSigner,
          message: {
            raw: toBytes(messageHash)
          }
        })
      )
    },

    async signTypedData<
      TTypedData extends TypedData | Record<string, unknown>,
      TPrimaryType extends keyof TTypedData | 'EIP712Domain' = keyof TTypedData
    >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
      return adjustVInSignature(
        'eth_signTypedData',
        await signTypedData(client, {
          account: viemSigner,
          domain: {
            chainId: chainId,
            verifyingContract: accountAddress
          },
          types: {
            SafeMessage: [{ name: 'message', type: 'bytes' }]
          },
          primaryType: 'SafeMessage',
          message: {
            message: generateSafeMessageMessage<TTypedData, TPrimaryType>(typedData)
          }
        })
      )
    },
    async signTransaction(_, __) {
      throw new SignTransactionNotSupportedBySmartAccount()
    },

    // Get the nonce of the smart account
    async getNonce() {
      return await getAccountNonce(client, {
        sender: accountAddress,
        entryPoint: entryPointAddress,
        key: BigInt(
          pad(initialValidatorAddress, {
            dir: 'right',
            size: 24
          }) || 0
        )
      })
    },

    // Sign a user operation
    async signUserOperation(userOperation) {
      const hash = getUserOperationHash({
        userOperation: {
          ...userOperation,
          signature: '0x'
        },
        entryPoint: entryPointAddress,
        chainId: chainId
      })

      const signature = await signMessage(client, {
        account: viemSigner,
        message: { raw: hash }
      })
      return signature
    },

    async getFactory() {
      if (smartAccountDeployed) return undefined
      smartAccountDeployed = await isSmartAccountDeployed(client, accountAddress)
      if (smartAccountDeployed) return undefined

      return factoryAddress
    },

    async getFactoryData() {
      // if (smartAccountDeployed) return undefined
      smartAccountDeployed = await isSmartAccountDeployed(client, accountAddress)
      if (smartAccountDeployed) return undefined
      return generateInitCode()
    },

    // Encode the init code
    async getInitCode() {
      // if (smartAccountDeployed) return "0x"
      smartAccountDeployed = await isSmartAccountDeployed(client, accountAddress)
      if (smartAccountDeployed) return '0x'

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
        return encodeFunctionData({
          functionName: 'execute',
          abi: executeAbi,
          args: [
            CALL_TYPE.BATCH,
            encodeAbiParameters(
              [
                {
                  components: [
                    {
                      name: 'to',
                      type: 'address'
                    },
                    {
                      name: 'value',
                      type: 'uint256'
                    },
                    {
                      name: 'data',
                      type: 'bytes'
                    }
                  ],
                  name: 'Execution',
                  type: 'tuple[]'
                }
              ],
              // @ts-ignore
              [argsArray]
            )
          ]
        })
      }
      const { to, value, data } = args as {
        to: Address
        value: bigint
        data: Hex
      }
      return encodeFunctionData({
        functionName: 'execute',
        abi: executeAbi,
        args: [
          CALL_TYPE.SINGLE,
          encodePacked(['address', 'uint256', 'bytes'], [to, BigInt(Number(value)), data])
        ]
      })
    },

    // Get simple dummy signature for authorization
    async getDummySignature(_userOperation) {
      return `0xe8b94748580ca0b4993c9a1b86b5be851bfc076ff5ce3a1ff65bf16392acfcb800f9b4f1aef1555c7fce5599fffb17e7c635502154a0333ba21f3ae491839af51c`
    }
  })
}
