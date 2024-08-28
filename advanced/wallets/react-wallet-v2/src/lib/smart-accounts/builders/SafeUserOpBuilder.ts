import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  FillUserOpParams,
  FillUserOpResponse,
  SendUserOpWithSignatureParams,
  SendUserOpWithSignatureResponse,
  UserOpBuilder
} from './UserOpBuilder'
import {
  Address,
  Chain,
  createPublicClient,
  Hex,
  http,
  pad,
  parseAbi,
  PublicClient,
  trim,
  zeroAddress
} from 'viem'
import { signerToSafeSmartAccount } from 'permissionless/accounts'
import {
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V07,
  getAccountNonce,
  getUserOperationHash
} from 'permissionless'
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient
} from 'permissionless/clients/pimlico'
import { bundlerUrl, paymasterUrl, publicClientUrl } from '@/utils/SmartAccountUtil'

import { getChainById } from '@/utils/ChainUtil'
import { SAFE_FALLBACK_HANDLER_STORAGE_SLOT } from '@/consts/smartAccounts'
import { formatSignature } from './SmartSessionUserOpBuilder'

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
        sponsorUserOperation:
          params.capabilities.paymasterService && paymasterClient.sponsorUserOperation, // optional
        gasPrice: async () => (await pimlicoBundlerClient.getUserOperationGasPrice()).fast // if using pimlico bundler
      }
    })
    const account = smartAccountClient.account

    const validatorAddress = (params.capabilities.permissions?.context.slice(0, 42) ||
      zeroAddress) as Address
    let nonce: bigint = await getAccountNonce(this.publicClient, {
      sender: this.accountAddress,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      key: BigInt(
        pad(validatorAddress, {
          dir: 'right',
          size: 24
        }) || 0
      )
    })

    const userOp = await smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        nonce: nonce,
        callData: await account.encodeCallData(params.calls),
        callGasLimit: BigInt('0x1E8480'),
        verificationGasLimit: BigInt('0x1E8480'),
        preVerificationGas: BigInt('0x1E8480')
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
  async sendUserOpWithSignature(
    params: SendUserOpWithSignatureParams
  ): Promise<SendUserOpWithSignatureResponse> {
    const { userOp, permissionsContext } = params
    if (permissionsContext) {
      const formattedSignature = await formatSignature(this.publicClient, {
        signature: userOp.signature,
        permissionsContext,
        accountAddress: userOp.sender
      })
      userOp.signature = formattedSignature
    }
    const bundlerTransport = http(bundlerUrl({ chain: this.chain }), {
      timeout: 30000
    })
    const pimlicoBundlerClient = createPimlicoBundlerClient({
      chain: this.chain,
      transport: bundlerTransport,
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })

    const userOpHash = await pimlicoBundlerClient.sendUserOperation({
      userOperation: {
        ...userOp,
        callData: userOp.callData,
        callGasLimit: BigInt(userOp.callGasLimit),
        nonce: BigInt(userOp.nonce),
        preVerificationGas: BigInt(userOp.preVerificationGas),
        verificationGasLimit: BigInt(userOp.verificationGasLimit),
        sender: userOp.sender,
        signature: userOp.signature,
        maxFeePerGas: BigInt(userOp.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas)
      }
    })

    return {
      receipt: userOpHash
    }
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
