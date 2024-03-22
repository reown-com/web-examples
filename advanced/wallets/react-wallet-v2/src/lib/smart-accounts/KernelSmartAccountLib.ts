import {
  Address,
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  getAbiItem,
  Hex,
  http,
  parseAbiParameters,
  PrivateKeyAccount,
  PublicClient,
  toBytes,
  toFunctionSelector,
  toHex,
  zeroAddress
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { EIP155Wallet } from '../EIP155Lib'
import { JsonRpcProvider } from '@ethersproject/providers'
import { KernelValidator, signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import {
  addressToEmptyAccount,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient,
  KernelV3ExecuteAbi
} from '@zerodev/sdk'
import { sepolia } from 'viem/chains'
import {
  BundlerActions,
  bundlerActions,
  BundlerClient,
  ENTRYPOINT_ADDRESS_V07
} from 'permissionless'
import { Chain } from '@/consts/smartAccounts'
import { EntryPoint } from 'permissionless/_types/types'
import { signerToDonutValidator } from './toDonutValidator'
import { ENTRYPOINT_ADDRESS_V07_TYPE } from 'permissionless/types/entrypoint'

type SmartAccountLibOptions = {
  privateKey: string
  chain: Chain
  sponsored?: boolean
}

const DONUT_VALIDATOR_ADDRESS = '0xC26abD34b53C6E61ec8CbE34b841228E04CfFA62'

export class KernelSmartAccountLib implements EIP155Wallet {
  public chain: Chain
  public isDeployed: boolean = false
  public address?: `0x${string}`
  public sponsored: boolean = true
  private signer: PrivateKeyAccount
  private client: KernelAccountClient<EntryPoint> | undefined
  private publicClient:
    | (PublicClient & BundlerClient<EntryPoint> & BundlerActions<EntryPoint>)
    | undefined
  private validator: KernelValidator<ENTRYPOINT_ADDRESS_V07_TYPE, 'ECDSAValidator'> | undefined
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
      // @ts-ignore
    }).extend(bundlerActions)

    this.validator = await signerToEcdsaValidator(this.publicClient, {
      signer: this.signer,
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })

    const account = await createKernelAccount(this.publicClient, {
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      plugins: {
        sudo: this.validator,
        entryPoint: ENTRYPOINT_ADDRESS_V07
      }
    })

    const client = createKernelAccountClient({
      account,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      chain: sepolia,
      bundlerTransport: bundlerRpc,
      middleware: {
        sponsorUserOperation: async ({ userOperation }) => {
          const zerodevPaymaster = createZeroDevPaymasterClient({
            chain: sepolia,
            transport: http(`https://rpc.zerodev.app/api/v2/paymaster/${projectId}`),
            entryPoint: ENTRYPOINT_ADDRESS_V07
          })
          return zerodevPaymaster.sponsorUserOperation({
            userOperation,
            entryPoint: ENTRYPOINT_ADDRESS_V07
          })
        }
      }
      // @ts-ignore
    }).extend(bundlerActions)
    //@ts-ignore
    this.client = client
    console.log('Smart account initialized', {
      address: account.address,
      // @ts-ignore
      chain: client.chain.name,
      type: this.type
    })
    this.initialized = true

    // just testing
    console.log(
      'test permissionsContext:',
      await this.getPermissionsContext('0x957c92075bB364B66560A89e141637BFBda76d5a', BigInt(100))
    )
  }

  async getPermissionsContext(sessionPublicKey: Address, limit: bigint): Promise<Hex> {
    const donutValidator = await signerToDonutValidator(this.publicClient!, {
      signer: addressToEmptyAccount(sessionPublicKey),
      donutLimit: limit,
      validatorAddress: DONUT_VALIDATOR_ADDRESS
    })

    const executeSelector = toFunctionSelector(
      getAbiItem({ abi: KernelV3ExecuteAbi, name: "execute" })
    )

    const account = await createKernelAccount(this.publicClient!, {
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      plugins: {
        sudo: this.validator,
        regular: donutValidator,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        executorData: {
          selector: executeSelector,
          executor: zeroAddress
        }
      }
    })

    console.log('factory:', await account.getFactory())
    console.log('factory data:', await account.getFactoryData())

    const enableSig = await account.kernelPluginManager.getPluginEnableSignature(account.address)

    return encodePacked(
      ['bytes1', 'bytes1', 'address', 'address', 'bytes'],
      [
        '0x01',
        '0x01',
        DONUT_VALIDATOR_ADDRESS,
        zeroAddress,
        encodeAbiParameters(
          parseAbiParameters('bytes, bytes, bytes, bytes'),
          [
            encodePacked(
              ['address', 'uint256'],
              [sessionPublicKey, limit],
            ),
            '0x',
            executeSelector,
            enableSig,
          ]
        ),
      ]
    )
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
}
