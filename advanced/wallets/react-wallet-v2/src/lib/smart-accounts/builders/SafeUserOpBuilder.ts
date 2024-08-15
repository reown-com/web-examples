import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  FillUserOpParams,
  FillUserOpResponse,
  SendUserOpWithSigantureParams,
  SendUserOpWithSigantureResponse,
  UserOpBuilder
} from './UserOpBuilder'
import {
  Address,
  Chain,
  createPublicClient,
  GetStorageAtReturnType,
  Hex,
  http,
  parseAbi,
  PublicClient,
  trim
} from 'viem'
import { signerToSafeSmartAccount } from 'permissionless/accounts'
import {
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V07,
  getUserOperationHash
} from 'permissionless'
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient
} from 'permissionless/clients/pimlico'
import { bundlerUrl, paymasterUrl, publicClientUrl } from '@/utils/SmartAccountUtil'

import { getChainById } from '@/utils/ChainUtil'
import { SAFE_FALLBACK_HANDLER_STORAGE_SLOT } from '@/consts/smartAccounts'

const ERC_7579_LAUNCHPAD_ADDRESS: Address = '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'

export class SafeUserOpBuilder implements UserOpBuilder {
  protected chain: Chain
  protected publicClient: PublicClient
  protected accountAddress: Address

  constructor(accountAddress: Address, chainId: number) {
    this.chain = getChainById(chainId)
    this.publicClient = createPublicClient({
      transport: http(publicClientUrl({ chain: this.chain }))
    })
    this.accountAddress = accountAddress
  }

  async fillUserOp(params: FillUserOpParams): Promise<FillUserOpResponse> {
    const privateKey = generatePrivateKey()
    const signer = privateKeyToAccount(privateKey)

    let erc7579LaunchpadAddress: Address
    const safe4337ModuleAddress = await this.getFallbackHandlerAddress()
    const is7579Safe = await this.is7579Safe()

    if (is7579Safe) {
      erc7579LaunchpadAddress = ERC_7579_LAUNCHPAD_ADDRESS
    }

    const version = await this.getVersion()

    const paymasterClient = createPimlicoPaymasterClient({
      transport: http(paymasterUrl({ chain: this.chain }), {
        timeout: 30000
      }),
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })

    const bundlerTransport = http(bundlerUrl({ chain: this.chain }), {
      timeout: 30000
    })
    const pimlicoBundlerClient = createPimlicoBundlerClient({
      transport: bundlerTransport,
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })

    const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      signer: signer,
      //@ts-ignore
      safeVersion: version,
      address: this.accountAddress,
      safe4337ModuleAddress,
      //@ts-ignore
      erc7579LaunchpadAddress
    })

    const smartAccountClient = createSmartAccountClient({
      account: safeAccount,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      chain: this.chain,
      bundlerTransport,
      middleware: {
        sponsorUserOperation: paymasterClient.sponsorUserOperation, // optional
        gasPrice: async () => (await pimlicoBundlerClient.getUserOperationGasPrice()).fast // if using pimlico bundler
      }
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
      chainId: this.chain.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })
    return {
      userOp,
      hash
    }
  }
  sendUserOpWithSignature(
    params: SendUserOpWithSigantureParams
  ): Promise<SendUserOpWithSigantureResponse> {
    throw new Error('Method not implemented.')
  }

  private async getVersion(): Promise<string> {
    const version = await this.publicClient.readContract({
      address: this.accountAddress,
      abi: parseAbi(['function VERSION() view returns (string)']),
      functionName: 'VERSION',
      args: []
    })
    return version
  }

  private async is7579Safe(): Promise<boolean> {
    const accountId = await this.publicClient.readContract({
      address: this.accountAddress,
      abi: parseAbi([
        'function accountId() external view returns (string memory accountImplementationId)'
      ]),
      functionName: 'accountId',
      args: []
    })
    if (accountId.includes('7579') && accountId.includes('safe')) {
      return true
    }
    return false
  }

  private async getFallbackHandlerAddress(): Promise<Address> {
    const value = await this.publicClient.getStorageAt({
      address: this.accountAddress,
      slot: SAFE_FALLBACK_HANDLER_STORAGE_SLOT
    })
    return trim(value as Hex)
  }
}
