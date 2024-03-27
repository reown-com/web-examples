import { Address, createPublicClient, Hex, http, PrivateKeyAccount, PublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
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
import { BundlerActions, bundlerActions, BundlerClient } from 'permissionless'
import { Chain } from '@/consts/smartAccounts'
import { EntryPoint } from 'permissionless/types/entrypoint'

type SmartAccountLibOptions = {
  privateKey: string
  chain: Chain
  sponsored?: boolean
}

export class KernelSmartAccountLib implements EIP155Wallet {
  public chain: Chain
  public isDeployed: boolean = false
  public address?: `0x${string}`
  public sponsored: boolean = true
  private signer: PrivateKeyAccount
  private client: KernelAccountClient | undefined
  private publicClient: (PublicClient & BundlerClient<EntryPoint> & BundlerActions<EntryPoint>) | undefined
  private validator: KernelValidator | undefined
  public initialized = false

  #signerPrivateKey: string
  public type: string = 'Kernel'

  public constructor({ privateKey, chain, sponsored = false }: SmartAccountLibOptions) {
    this.chain = chain
    this.sponsored = sponsored
    this.#signerPrivateKey = privateKey
    this.signer = privateKeyToAccount(privateKey as Hex)
  }
  async init() {
    const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID
    if (!projectId) {
      throw new Error('ZeroDev project id expected')
    }
    const bundlerRpc = http(`https://rpc.zerodev.app/api/v2/bundler/${projectId}`)
    this.publicClient = createPublicClient({
      transport: bundlerRpc // use your RPC provider or bundler
      //@ts-ignore
    }).extend(bundlerActions)

    this.validator = await createWeightedECDSAValidator(this.publicClient, {
      config: {
        threshold: 100,
        signers: [{ address: this.signer.address, weight: 100 }]
      },
      signers: [this.signer]
    })

    const account = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator
      }
    })
    const client = createKernelAccountClient({
      account,
      chain: sepolia,
      transport: bundlerRpc,
      sponsorUserOperation: async ({ userOperation }) => {
        const zerodevPaymaster = createZeroDevPaymasterClient({
          chain: sepolia,
          transport: http(`https://rpc.zerodev.app/api/v2/paymaster/${projectId}`)
        })
        return zerodevPaymaster.sponsorUserOperation({
          userOperation
        })
      }
      //@ts-ignore
    }).extend(bundlerActions)
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
      }
    })
    const sessionKeyAccount = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator,
        regular: sessionKeyValidator
      }
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

    const updateCall = getUpdateConfigCall({
      threshold: 100,
      signers: newSigners
    })

    await this.sendTransaction(updateCall)
  }
}
