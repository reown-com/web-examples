import { WalletGrantPermissionsParameters, WalletGrantPermissionsReturnType } from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { KernelValidator, signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import { addressToEmptyAccount, createKernelAccount } from '@zerodev/sdk'
import { serializeSessionKeyAccount, signerToSessionKeyValidator } from '@zerodev/session-key'
import { getUpdateConfigCall } from '@zerodev/weighted-ecdsa-validator'
import { ENTRYPOINT_ADDRESS_V06, SmartAccountClientConfig } from 'permissionless'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { KERNEL_V2_4, KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { KERNEL_V2_VERSION_TYPE, KERNEL_V3_VERSION_TYPE } from '@zerodev/sdk/types'
import { decodeDIDToSecp256k1PublicKey } from '@/utils/HelperUtil'
import { KeySigner } from 'viem/_types/experimental/erc7715/types/signer'
import { SmartAccountLib } from './SmartAccountLib'

type DonutPurchasePermissionData = {
  target: string
  abi: any
  valueLimit: bigint
  functionName: string
}

export class KernelSmartAccountLib extends SmartAccountLib {
  public isDeployed: boolean = false
  public address?: `0x${string}`

  public kernelVersion: KERNEL_V3_VERSION_TYPE | KERNEL_V2_VERSION_TYPE = KERNEL_V3_1
  private validator: KernelValidator<EntryPoint> | undefined

  public type: string = 'Kernel'

  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    if (this.entryPoint === ENTRYPOINT_ADDRESS_V06) {
      this.kernelVersion = KERNEL_V2_4
    }
    this.validator = await signerToEcdsaValidator(this.publicClient, {
      signer: this.signer,
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })

    const kernelAccount = await createKernelAccount(this.publicClient, {
      plugins: {
        sudo: this.validator
      },
      entryPoint: this.entryPoint,
      kernelVersion: this.kernelVersion
    })
    return {
      name: 'KernelSmartAccount',
      account: kernelAccount,
      chain: this.chain,
      entryPoint: this.entryPoint,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
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

  getAccount() {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    return this.client.account
  }
}
