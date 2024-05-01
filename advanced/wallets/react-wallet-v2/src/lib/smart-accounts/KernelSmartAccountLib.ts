import {
  Address,
  concatHex,
  createPublicClient,
  encodeFunctionData,
  Hex,
  http,
  keccak256,
  PrivateKeyAccount,
  PublicClient,
  Transport,
  zeroAddress
} from 'viem'
import { privateKeyToAccount, signMessage } from 'viem/accounts'
import { EIP155Wallet } from '../EIP155Lib'
import { JsonRpcProvider } from '@ethersproject/providers'
import { KernelValidator } from '@zerodev/ecdsa-validator'
import {
  addressToEmptyAccount,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient
} from '@zerodev/sdk'
import { sepolia } from 'viem/chains'
import { serializeSessionKeyAccount, signerToSessionKeyValidator } from '@zerodev/session-key'
import {
  createWeightedECDSAValidator,
  getUpdateConfigCall
} from '@zerodev/weighted-ecdsa-validator'
import {
  BundlerActions,
  bundlerActions,
  BundlerClient,
  ENTRYPOINT_ADDRESS_V06,
  ENTRYPOINT_ADDRESS_V07,
  getPackedUserOperation
} from 'permissionless'
import { Chain } from '@/consts/smartAccounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { PERMISSION_VALIDATOR_ADDRESS, SECP256K1_SIGNATURE_VALIDATOR_ADDRESS } from '@/utils/permissionValidatorUtils/constants'
import { isModuleInstalledAbi } from '@/utils/safe7579AccountUtils/abis/Account'
import { ENTRYPOINT_ADDRESS_V07_TYPE, UserOperation } from 'permissionless/_types/types'
import { getPermissionScopeData, PermissionContext, SingleSignerPermission } from '@/utils/permissionValidatorUtils'

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
  private signer: PrivateKeyAccount
  private client: KernelAccountClient<EntryPoint, Transport, Chain | undefined> | undefined
  private publicClient:
    | (PublicClient & BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE> & BundlerActions<ENTRYPOINT_ADDRESS_V07_TYPE>)
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
    let entryPoint: EntryPoint = ENTRYPOINT_ADDRESS_V07
    if (entryPointVersion === 6) {
      entryPoint = ENTRYPOINT_ADDRESS_V06
    }
    this.entryPoint = entryPoint
  }
  async init() {
    const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID
    if (!projectId) {
      throw new Error('ZeroDev project id expected')
    }
    const bundlerRpc = http(`https://rpc.zerodev.app/api/v2/bundler/${projectId}`)
    this.publicClient = createPublicClient({
      transport: bundlerRpc // use your RPC provider or bundler
    }).extend(bundlerActions(ENTRYPOINT_ADDRESS_V07))

    this.validator = await createWeightedECDSAValidator(this.publicClient, {
      config: {
        threshold: 100,
        signers: [{ address: this.signer.address, weight: 100 }]
      },
      signers: [this.signer],
      entryPoint: this.entryPoint
    })

    const account = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator,
      },
      entryPoint: this.entryPoint
    })
    const client = createKernelAccountClient({
      account,
      chain: sepolia,
      entryPoint: this.entryPoint,
      bundlerTransport: bundlerRpc,
      middleware: {
        sponsorUserOperation: async ({ userOperation }) => {
          const zerodevPaymaster = createZeroDevPaymasterClient({
            chain: sepolia,
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
    }).extend(bundlerActions(ENTRYPOINT_ADDRESS_V07))
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
  async sendTransaction({ to, value, data }: { to: Address; value: bigint; data: Hex }) {
    console.log('Sending transaction from smart account', { to, value, data })
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }

    const txResult = await this.client.sendTransaction({
      to,
      value,
      data,
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

    const sessionKeyValidator = await signerToSessionKeyValidator(this.publicClient, {
      signer: emptySessionKeySigner,
      validatorData: {
        permissions: parsedPermissions
      },
      entryPoint: this.entryPoint
    })
    const sessionKeyAccount = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator,
        regular: sessionKeyValidator
      },
      entryPoint: this.entryPoint
    })
    console.log('Session key account initialized', { address: sessionKeyAccount.address })
    const serializedSessionKey = await serializeSessionKeyAccount(sessionKeyAccount)
    return serializedSessionKey
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

    const updateCall = getUpdateConfigCall(this.entryPoint, {
      threshold: 100,
      signers: newSigners
    })

    await this.sendTransaction(updateCall)
  }

  async installPermissionValidatorModule(
    args: {
      to: Address
      value: bigint
      data: Hex
    }[]
  ) {
    console.log('installing module from smart account', { type: this.type, args })
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    
    const userOp = await this.client.prepareUserOperationRequest({
      userOperation: {
        callData: await this.getInstallModuleCalldata(PERMISSION_VALIDATOR_ADDRESS,zeroAddress)
      },
      account: this.client.account,
    })
    this.client.account.getNonce(BigInt(1))
    const newSignature = await this.client.account.signUserOperation(userOp)
    
    userOp.signature = newSignature
    console.log(userOp);
    const userOpHash = await this.client.sendUserOperation({
      userOperation: userOp,
      account: this.client.account
    })
    return userOpHash
  }

  async getInstallModuleCalldata(moduleAddress:Address,initData:`0x${string}`){
    const installModuleCallData = encodeFunctionData({
      abi:[{
        "type": "function",
        "name": "installModule",
        "inputs": [
          { "name": "moduleType", "type": "uint256", "internalType": "uint256" },
          { "name": "module", "type": "address", "internalType": "address" },
          { "name": "initData", "type": "bytes", "internalType": "bytes" }
        ],
        "outputs": [],
        "stateMutability": "payable"
      }],
      functionName:"installModule",
      args:[BigInt(1),moduleAddress,initData]
    })
    return installModuleCallData;

  }

  async checkPermissionValidatorModuleInstalled(){
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const permissionValidatorAddress = PERMISSION_VALIDATOR_ADDRESS

    const isModuleInstalled = (await this.publicClient!.readContract({
      address: this.client.account.address,
      abi: isModuleInstalledAbi,
      functionName: "isModuleInstalled",
      args: [
        BigInt(1),  // ModuleType
        permissionValidatorAddress, // Module Address
        "0x"    // Additional Context
      ],
    }));
    console.log(`isModuleInstalled : ${isModuleInstalled}`)
  }

  async issuePermissionContext(
    targetAddress: Address,
    approvedPermissions: any
  ): Promise<PermissionContext> {
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    // this permission have dummy policy set to zeroAddress for now,
    // bc current version of PermissionValidator_v1 module don't consider checking policy
    const permissions: SingleSignerPermission[] = [
      {
        validUntil: 0,
        validAfter: 0,
        signatureValidationAlgorithm: SECP256K1_SIGNATURE_VALIDATOR_ADDRESS,
        signer: targetAddress,
        policy: zeroAddress,
        policyData: '0x'
      }
    ]

    const permittedScopeData = getPermissionScopeData(permissions, this.chain)
    // the smart account sign over the permittedScope and targetAddress
    const permittedScopeSignature: Hex = await signMessage({
      privateKey: this.getPrivateKey() as `0x${string}`,
      message: { raw: concatHex([keccak256(permittedScopeData), targetAddress]) }
    })

    return {
      accountAddress: this.client.account.address,
      permissionValidatorAddress: PERMISSION_VALIDATOR_ADDRESS,
      permissions: permissions,
      permittedScopeData: permittedScopeData,
      permittedScopeSignature: permittedScopeSignature
    }
  }
}