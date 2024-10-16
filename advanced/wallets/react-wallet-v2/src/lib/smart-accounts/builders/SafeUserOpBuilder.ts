import { generatePrivateKey, privateKeyToAccount, signMessage } from 'viem/accounts'
import {
  PrepareCallsParams,
  PrepareCallsReturnValue,
  SendPreparedCallsParams,
  SendPreparedCallsReturnValue,
  UserOpBuilder,
  UserOperationWithBigIntAsHex
} from './UserOpBuilder'
import {
  Address,
  Chain,
  createPublicClient,
  encodeAbiParameters,
  Hex,
  http,
  parseAbi,
  PublicClient,
  toHex,
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
import { formatSignature, getDummySignature, getNonce } from './UserOpBuilderUtil'
import { CosignerService } from './CosignerService'
const { getAccount } = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

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
  async prepareCalls(
    projectId: string,
    params: PrepareCallsParams
  ): Promise<PrepareCallsReturnValue> {
    const privateKey = generatePrivateKey()
    const signer = privateKeyToAccount(privateKey)

    let erc7579LaunchpadAddress: Address
    const safe4337ModuleAddress = await this.getFallbackHandlerAddress()
    const is7579Safe = await this.is7579Safe()

    if (is7579Safe) {
      erc7579LaunchpadAddress = ERC_7579_LAUNCHPAD_ADDRESS
    }

    const version = await this.getVersion()
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
    const smartAccountClient = createSmartAccountClient({
      account: safeAccount,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      chain: this.chain,
      bundlerTransport,
      middleware: {
        sponsorUserOperation: paymasterClient.sponsorUserOperation,
        gasPrice: async () => (await pimlicoBundlerClient.getUserOperationGasPrice()).fast // if using pimlico bundler
      }
    })

    const account = getAccount({
      address: smartAccountClient.account.address,
      type: 'safe'
    })

    const pci = params.capabilities.permissions?.context!
    const cosignerService = new CosignerService(projectId)
    const caip10AccountAddress = `eip155:${this.chain.id}:${this.accountAddress}`
    const permissionsContext = await cosignerService.getPermissionsContext(caip10AccountAddress, {
      pci
    })
    let nonce: bigint = await getNonce({
      publicClient: this.publicClient,
      account,
      permissionsContext: permissionsContext.context
    })
    const callData = await smartAccountClient.account.encodeCallData(
      params.calls.map(call => ({
        to: call.to,
        value: BigInt(call.value),
        data: call.data
      }))
    )

    const dummySignature = await getDummySignature({
      publicClient: this.publicClient,
      account,
      permissionsContext: permissionsContext.context
    })
    const userOp = await smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        nonce: nonce,
        callData: callData,
        signature: dummySignature
      },
      account: smartAccountClient.account
    })
    const hash = getUserOperationHash({
      userOperation: userOp,
      chainId: this.chain.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07
    })

    return {
      context: params.capabilities.permissions?.context!,
      preparedCalls: {
        chainId: toHex(this.chain.id),
        type: 'user-operation-v07',
        data: userOp
      },
      signatureRequest: {
        hash: hash
      }
    }
  }

  async sendPreparedCalls(
    projectId: string,
    params: SendPreparedCallsParams
  ): Promise<SendPreparedCallsReturnValue> {
    try {
      const { context, preparedCalls, signature } = params
      const { chainId, data, type } = preparedCalls
      const chainIdNumber = parseInt(chainId)
      if (type !== 'user-operation-v07') {
        throw new Error('Invalid preparedCalls type')
      }

      //Get PermissionsContext from WalletConnectCosigner given pci
      const pci = context
      const cosignerService = new CosignerService(projectId)
      const caip10AccountAddress = `eip155:${this.chain.id}:${this.accountAddress}`
      const permissionsContext = await cosignerService.getPermissionsContext(caip10AccountAddress, {
        pci
      })
      if (pci && projectId) {
        const userOpWithBigIntAsHex: UserOperationWithBigIntAsHex = {
          ...data,
          nonce: toHex(BigInt(data.nonce)),
          callGasLimit: toHex(BigInt(data.callGasLimit)),
          verificationGasLimit: toHex(BigInt(data.verificationGasLimit)),
          preVerificationGas: toHex(BigInt(data.preVerificationGas)),
          maxFeePerGas: toHex(BigInt(data.maxFeePerGas)),
          maxPriorityFeePerGas: toHex(BigInt(data.maxPriorityFeePerGas)),
          paymasterPostOpGasLimit: data.paymasterPostOpGasLimit
            ? toHex(BigInt(data.paymasterPostOpGasLimit))
            : undefined,
          paymasterVerificationGasLimit: data.paymasterVerificationGasLimit
            ? toHex(BigInt(data.paymasterVerificationGasLimit))
            : undefined,
          factory: data.factory,
          factoryData: data.factoryData,
          paymaster: data.paymaster,
          paymasterData: data.paymasterData,
          signature: signature
        }
        const cosignerService = new CosignerService(projectId)
        const caip10AccountAddress = `eip155:${chainIdNumber}:${userOpWithBigIntAsHex.sender}`
        const cosignResponse = await cosignerService.coSignUserOperation(caip10AccountAddress, {
          pci,
          userOp: userOpWithBigIntAsHex
        })
        data.signature = cosignResponse.signature
      }

      const account = getAccount({
        address: data.sender,
        type: 'safe'
      })

      if (permissionsContext.context) {
        const formattedSignature = await formatSignature({
          publicClient: this.publicClient,
          account,
          modifiedSignature: data.signature,
          permissionsContext: permissionsContext.context
        })
        data.signature = formattedSignature
      }

      const bundlerTransport = http(bundlerUrl({ chain: this.chain }), {
        timeout: 30000
      })
      const pimlicoBundlerClient = createPimlicoBundlerClient({
        chain: this.chain,
        transport: bundlerTransport,
        entryPoint: ENTRYPOINT_ADDRESS_V07
      })

      const userOpId = await pimlicoBundlerClient.sendUserOperation({
        userOperation: {
          ...data,
          signature: data.signature,
          callGasLimit: BigInt(data.callGasLimit),
          nonce: BigInt(data.nonce),
          preVerificationGas: BigInt(data.preVerificationGas),
          verificationGasLimit: BigInt(data.verificationGasLimit),
          maxFeePerGas: BigInt(data.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(data.maxPriorityFeePerGas),
          paymasterVerificationGasLimit:
            data.paymasterVerificationGasLimit && BigInt(data.paymasterVerificationGasLimit),
          paymasterPostOpGasLimit:
            data.paymasterPostOpGasLimit && BigInt(data.paymasterPostOpGasLimit)
        }
      })

      return `${toHex(this.chain.id)}:${userOpId}`
    } catch (e) {
      console.log(e)
      throw new Error('Failed to sign user operation with cosigner')
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
