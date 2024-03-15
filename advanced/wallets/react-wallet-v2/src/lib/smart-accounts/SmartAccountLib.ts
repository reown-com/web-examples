import {
  Hex,
  PrivateKeyAccount,
  PublicClient,
  createPublicClient,
  http,
  createClient,
  HttpTransport,
  Address
} from 'viem'
import { EIP155Wallet } from '../EIP155Lib'
import { JsonRpcProvider } from '@ethersproject/providers'
import { privateKeyToAccount } from 'viem/accounts'
import {
  PimlicoPaymasterClient,
  createPimlicoPaymasterClient
} from 'permissionless/clients/pimlico'
import {
  BundlerActions,
  BundlerClient,
  SmartAccountClient,
  SmartAccountClientConfig,
  bundlerActions,
  createSmartAccountClient
} from 'permissionless'
import { PimlicoBundlerActions, pimlicoBundlerActions } from 'permissionless/actions/pimlico'
import { PIMLICO_NETWORK_NAMES, UrlConfig, publicRPCUrl } from '@/utils/SmartAccountUtil'
import { Chain } from '@/consts/smartAccounts'

type SmartAccountLibOptions = {
  privateKey: string
  chain: Chain
  sponsored?: boolean
}

export abstract class SmartAccountLib implements EIP155Wallet {
  // Options
  public chain: Chain
  public sponsored: boolean = true

  // Signer
  protected signer: PrivateKeyAccount
  #signerPrivateKey: string

  // Clients
  protected publicClient: PublicClient
  protected paymasterClient: PimlicoPaymasterClient
  protected bundlerClient: BundlerClient & BundlerActions & PimlicoBundlerActions
  protected client: (SmartAccountClient & PimlicoBundlerActions) | undefined

  // Transport
  protected bundlerUrl: HttpTransport
  protected paymasterUrl: HttpTransport

  // Utility
  public type: string
  public initialized = false

  public constructor({ privateKey, chain, sponsored = false }: SmartAccountLibOptions) {
    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
    const paymasterUrl = ({ chain }: UrlConfig) =>
      `https://api.pimlico.io/v2/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
    const bundlerUrl = ({ chain }: UrlConfig) =>
      `https://api.pimlico.io/v1/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`

    this.chain = chain
    this.sponsored = sponsored
    this.#signerPrivateKey = privateKey
    this.signer = privateKeyToAccount(privateKey as Hex)

    this.bundlerUrl = http(bundlerUrl({ chain: this.chain }))
    this.paymasterUrl = http(paymasterUrl({ chain: this.chain }))

    this.publicClient = createPublicClient({
      transport: http(publicRPCUrl({ chain: this.chain }))
    }).extend(bundlerActions)

    this.paymasterClient = createPimlicoPaymasterClient({
      transport: this.paymasterUrl
    })

    this.bundlerClient = createClient({
      transport: this.bundlerUrl,
      chain: this.chain
    })
      .extend(bundlerActions)
      .extend(pimlicoBundlerActions)

    const name = this.constructor.name.replace('SmartAccountLib', '')
    this.type = name && name.length > 0 ? name : 'Unknown'
  }

  abstract getClientConfig(): Promise<SmartAccountClientConfig>

  async init() {
    const config = await this.getClientConfig()
    this.client = createSmartAccountClient(config).extend(pimlicoBundlerActions)
    console.log('Smart account initialized', {
      address: this.client.account?.address,
      chain: this.chain.name,
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
    console.log('Signing typed data with Smart Account', { type: this.type, domain, types, data })
    const primaryType = _primaryType || ''
    const signature = await this.client.account?.signTypedData({
      domain,
      types,
      primaryType,
      message: data
    })
    return signature || ''
  }
  connect(_provider: JsonRpcProvider): any {
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
    console.log('Sending transaction from smart account', { type: this.type, to, value, data })
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
}
