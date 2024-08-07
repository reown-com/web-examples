import {
  Address,
  createPublicClient,
  Hex,
  http,
  PrivateKeyAccount,
  PublicClient,
  Transport,
  WalletGrantPermissionsParameters,
  WalletGrantPermissionsReturnType
} from 'viem'
import { privateKeyToAccount, publicKeyToAddress, signMessage } from 'viem/accounts'
import { EIP155Wallet } from '../EIP155Lib'
import { JsonRpcProvider } from '@ethersproject/providers'
import { KernelValidator, signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import {
  addressToEmptyAccount,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient
} from '@zerodev/sdk'
import { serializeSessionKeyAccount, signerToSessionKeyValidator } from '@zerodev/session-key'
import { getUpdateConfigCall } from '@zerodev/weighted-ecdsa-validator'
import {
  BundlerActions,
  bundlerActions,
  BundlerClient,
  ENTRYPOINT_ADDRESS_V06,
  ENTRYPOINT_ADDRESS_V07
} from 'permissionless'
import { Chain } from '@/consts/smartAccounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { KERNEL_V2_4, KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { KERNEL_V2_VERSION_TYPE, KERNEL_V3_VERSION_TYPE } from '@zerodev/sdk/types'
import { decodeDIDToSecp256k1PublicKey } from '@/utils/HelperUtil'
import { KeySigner } from 'viem/_types/experimental/erc7715/types/signer'

type DonutPurchasePermissionData = {
  target: string
  abi: any
  valueLimit: bigint
  functionName: string
}

type SmartAccountLibOptions = {
  privateKey: string
  chain: Chain
  sponsored?: boolean
  entryPointVersion?: number
}

export class KernelSmartAccountLib implements EIP155Wallet {
  public chain: Chain
  public isDeployed: boolean = false
  public address?: `0x${string}`
  public sponsored: boolean = true
  public entryPoint: EntryPoint
  public kernelVersion: KERNEL_V3_VERSION_TYPE | KERNEL_V2_VERSION_TYPE
  private signer: PrivateKeyAccount
  private client: KernelAccountClient<EntryPoint, Transport, Chain | undefined> | undefined
  private publicClient:
    | (PublicClient & BundlerClient<EntryPoint> & BundlerActions<EntryPoint>)
    | undefined
  private validator: KernelValidator<EntryPoint> | undefined
  public initialized = false

  #signerPrivateKey: string
  public type: string = 'Kernel'

  public constructor({
    privateKey,
    chain,
    sponsored = false,
    entryPointVersion = 7
  }: SmartAccountLibOptions) {
    this.chain = chain
    this.sponsored = sponsored
    this.#signerPrivateKey = privateKey
    this.signer = privateKeyToAccount(privateKey as Hex)
    this.entryPoint = ENTRYPOINT_ADDRESS_V07
    this.kernelVersion = KERNEL_V3_1
    if (entryPointVersion === 6) {
      this.entryPoint = ENTRYPOINT_ADDRESS_V06
      this.kernelVersion = KERNEL_V2_4
    }
  }
  async init() {
    const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID
    if (!projectId) {
      throw new Error('ZeroDev project id expected')
    }
    const bundlerRpc = http(`https://rpc.zerodev.app/api/v2/bundler/${projectId}`)
    this.publicClient = createPublicClient({
      transport: bundlerRpc // use your RPC provider or bundler
    }).extend(bundlerActions(this.entryPoint))

    this.validator = await signerToEcdsaValidator(this.publicClient, {
      signer: this.signer,
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })

    const account = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator
      },
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })
    const client = createKernelAccountClient({
      account,
      chain: this.chain,
      entryPoint: this.entryPoint,
      bundlerTransport: bundlerRpc,
      middleware: {
        sponsorUserOperation: async ({ userOperation }) => {
          const zerodevPaymaster = createZeroDevPaymasterClient({
            chain: this.chain,
            entryPoint: this.entryPoint,
            // Get this RPC from ZeroDev dashboard
            transport: http(`https://rpc.zerodev.app/api/v2/paymaster/${projectId}`)
          })
          return zerodevPaymaster.sponsorUserOperation({
            userOperation,
            entryPoint: this.entryPoint
          })
        }
      }
    }).extend(bundlerActions(this.entryPoint))
    this.client = client
    console.log('Smart account initialized', {
      address: account.address,
      //@ts-ignore
      chain: client.chain.name,
      type: this.type
    })
    this.initialized = true
  }

  getMnemonic(): string {
    throw new Error('Method not implemented.')
  }
  getPrivateKey(): string {
    return this.#signerPrivateKey
  }
  getAddress(): string {
    if (!this.client) {
      throw new Error('Client not initialized')
    }
    return this.client.account?.address || ''
  }
  async signMessage(message: string): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }
    const signature = await this.client.account?.signMessage({ message })
    return signature || ''
  }
  async _signTypedData(
    domain: any,
    types: any,
    data: any,
    _primaryType?: string | undefined
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }
    console.log('Signing typed data with Kernel Smart Account')
    const primaryType = _primaryType || ''
    const signature = await this.client.account?.signTypedData({
      domain,
      types,
      primaryType,
      message: data
    })
    return signature || ''
  }
  connect(provider: JsonRpcProvider): any {
    if (!this.client) {
      throw new Error('Client not initialized')
    }
    return this
  }
  async signTransaction(transaction: any): Promise<string> {
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const signature = await this.client.account.signTransaction(transaction)
    return signature || ''
  }
  async sendTransaction({ to, value, data }: { to: Address; value: bigint | Hex; data: Hex }) {
    console.log('Sending transaction from smart account', { to, value, data })
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }

    const txResult = await this.client.sendTransaction({
      to,
      value: BigInt(value),
      data: data || '0x',
      account: this.client.account,
      chain: this.chain
    })
    console.log('Transaction completed', { txResult })

    return txResult
  }
  async sendBatchTransaction(
    args: {
      to: Address
      value: bigint
      data: Hex
    }[]
  ) {
    console.log('Sending transaction from smart account', { type: this.type, args })
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const userOp = await this.client.prepareUserOperationRequest({
      userOperation: {
        callData: await this.client.account.encodeCallData(args)
      },
      account: this.client.account
    })

    const newSignature = await this.client.account.signUserOperation(userOp)
    console.log('Signatures', { old: userOp.signature, new: newSignature })

    userOp.signature = newSignature

    const userOpHash = await this.client.sendUserOperation({
      userOperation: userOp,
      account: this.client.account
    })
    return userOpHash
  }

  async issueSessionKey(address: `0x${string}`, permissions: string): Promise<string> {
    if (!this.publicClient) {
      throw new Error('Client not initialized')
    }
    if (!address) {
      throw new Error('Target address is required')
    }
    const parsedPermissions = JSON.parse(permissions)
    const sessionKeyAddress = address
    console.log('Issuing new session key', { sessionKeyAddress })
    const emptySessionKeySigner = addressToEmptyAccount(sessionKeyAddress)
    console.log(parsedPermissions)
    const sessionKeyValidator = await signerToSessionKeyValidator(this.publicClient, {
      signer: emptySessionKeySigner,
      validatorData: {
        permissions: parsedPermissions
      },
      kernelVersion: this.kernelVersion,
      entryPoint: this.entryPoint
    })
    const sessionKeyAccount = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator,
        regular: sessionKeyValidator
      },
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })
    console.log('Session key account initialized', { address: sessionKeyAccount.address })
    const serializedSessionKey = await serializeSessionKeyAccount(sessionKeyAccount)
    return serializedSessionKey
  }

  async grantPermissions(
    grantPermissionsRequestParams: WalletGrantPermissionsParameters
  ): Promise<WalletGrantPermissionsReturnType> {
    if (!this.publicClient) {
      throw new Error('Client not initialized')
    }
    console.log('grantPermissions', { grantPermissionsRequestParams })

    const signer = grantPermissionsRequestParams.signer
    // check if signer type is  AccountSigner then it will have data.id
    if (signer && !(signer.type === 'key')) {
      throw Error('Currently only supporting KeySigner Type for permissions')
    }

    const typedSigner = signer as KeySigner
    const pubkey = decodeDIDToSecp256k1PublicKey(typedSigner.data.id)

    const emptySessionKeySigner = addressToEmptyAccount(publicKeyToAddress(pubkey as `0x${string}`))

    const permissions = grantPermissionsRequestParams.permissions
    const zeroDevPermissions = []

    for (const permission of permissions) {
      if (permission.type === 'donut-purchase') {
        const data = permission.data as DonutPurchasePermissionData
        zeroDevPermissions.push({
          target: data.target,
          abi: data.abi,
          valueLimit: data.valueLimit,
          functionName: data.functionName
        })
      }
    }
    const sessionKeyValidator = await signerToSessionKeyValidator(this.publicClient, {
      signer: emptySessionKeySigner,
      validatorData: {
        // @ts-ignore
        permissions: zeroDevPermissions
      },
      kernelVersion: this.kernelVersion,
      entryPoint: this.entryPoint
    })
    const sessionKeyAccount = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator,
        regular: sessionKeyValidator
      },
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })

    const serializedSessionKey = await serializeSessionKeyAccount(sessionKeyAccount)

    return {
      permissionsContext: serializedSessionKey,
      grantedPermissions: grantPermissionsRequestParams.permissions,
      expiry: grantPermissionsRequestParams.expiry
    } as WalletGrantPermissionsReturnType
  }

  async updateCoSigners(signers: `0x${string}`[]) {
    if (!this.client || !this.publicClient || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const currentAddress = this.signer.address

    if (signers.length === 0 || signers.length > 2) {
      throw new Error('Invalid signer setup')
    }
    const coSigners = signers.map(address => {
      return {
        address,
        weight: 100 / signers.length
      }
    })
    const newSigners = [{ address: currentAddress, weight: 100 }, ...coSigners]
    console.log('Updating account Co-Signers', { newSigners })

    const updateCall = getUpdateConfigCall(this.entryPoint, this.kernelVersion, {
      threshold: 100,
      signers: newSigners
    })

    await this.sendTransaction(updateCall)
  }

  async getCurrentNonce() {
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const currentNonce = await this.publicClient!.readContract({
      address: this.client.account.address,
      abi: [
        {
          type: 'function',
          name: 'currentNonce',
          inputs: [],
          outputs: [{ name: '', type: 'uint32', internalType: 'uint32' }],
          stateMutability: 'view'
        }
      ],
      functionName: 'currentNonce',
      args: [],
      factory: undefined,
      factoryData: undefined
    })
    console.log(`currentNonce : ${currentNonce}`)
    return currentNonce
  }

  getAccount() {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    return this.client.account
  }
}
