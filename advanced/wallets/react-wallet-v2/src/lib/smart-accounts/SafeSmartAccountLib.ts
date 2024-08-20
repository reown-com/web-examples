import {
  ENTRYPOINT_ADDRESS_V07,
  SmartAccountClientConfig,
  isSmartAccountDeployed
} from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount, signerToSafeSmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import {
  Address,
  Hex,
  WalletGrantPermissionsParameters,
  createWalletClient,
  http,
  type WalletGrantPermissionsReturnType
} from 'viem'
import { MultiKeySigner } from 'viem/_types/experimental/erc7715/types/signer'
import {
  getContext,
  mockValidator,
  Permission,
  smartSessionAddress,
  userOperationBuilderAddress
} from '@biconomy/permission-context-builder'
import { ModuleType } from 'permissionless/actions/erc7579'

export class SafeSmartAccountLib extends SmartAccountLib {
  protected ERC_7579_LAUNCHPAD_ADDRESS: Address = '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'
  protected SAFE_4337_MODULE_ADDRESS: Address = '0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2'

  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    this.type = 'Safe'
    const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
      safeVersion: '1.4.1',
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      safe4337ModuleAddress: this.SAFE_4337_MODULE_ADDRESS,
      //@ts-ignore
      erc7579LaunchpadAddress: this.ERC_7579_LAUNCHPAD_ADDRESS,
      signer: this.signer
    })
    return {
      name: 'Safe7579SmartAccount',
      account: safeAccount as SmartAccount<EntryPoint>,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      chain: this.chain,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
  }

  async manageModule(calls: { to: Address; value: bigint; data: Hex }[]) {
    const userOpHash = await this.sendBatchTransaction(calls)
    return await this.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash
    })
  }

  /* 7715 method */
  async grantPermissions(
    grantPermissionsRequestParameters: WalletGrantPermissionsParameters
  ): Promise<WalletGrantPermissionsReturnType> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    await this.ensureAccountReadyForGrantPermissions()

    const walletClient = createWalletClient({
      chain: this.chain,
      account: this.client.account,
      transport: http()
    })

    const permissionContext = await getContext(walletClient, {
      permissions: [...grantPermissionsRequestParameters.permissions] as unknown as Permission[],
      expiry: grantPermissionsRequestParameters.expiry,
      signer: grantPermissionsRequestParameters.signer as MultiKeySigner,
      smartAccountAddress: this.client.account.address
    })
    console.log(`Returning the permissions request`)
    return {
      permissionsContext: permissionContext,
      grantedPermissions: grantPermissionsRequestParameters.permissions,
      expiry: grantPermissionsRequestParameters.expiry,
      signerData: {
        userOpBuilder: userOperationBuilderAddress,
        submitToAddress: this.client.account.address
      }
    } as WalletGrantPermissionsReturnType
  }

  /**
   * Check Safe7579 Account is ready for processing this RPC request
   * - Check Account is deployed
   * - Check Permission Validator & Mock Validator modules are installed
   * If not, Deploy and installed all necessary module for processing this RPC request
   * @returns
   */
  private async ensureAccountReadyForGrantPermissions(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    try {
      const isAccountDeployed = await isSmartAccountDeployed(
        this.publicClient,
        this.client.account.address
      )

      let smartSessionValidatorInstalled = false
      let mockValidatorInstalled = false

      if (isAccountDeployed) {
        ;[smartSessionValidatorInstalled, mockValidatorInstalled] = await Promise.all([
          this.isValidatorModuleInstalled(smartSessionAddress),
          this.isValidatorModuleInstalled(mockValidator)
        ])
      }
      console.log({ smartSessionValidatorInstalled, mockValidatorInstalled })

      if (isAccountDeployed && smartSessionValidatorInstalled && mockValidatorInstalled) {
        console.log('Account is already set up with required modules')
        return
      }

      console.log('Setting up the Account with required modules')

      const installModules: {
        address: Address
        type: ModuleType
        context: Hex
      }[] = []

      if (!isAccountDeployed || !smartSessionValidatorInstalled) {
        installModules.push({
          address: smartSessionAddress,
          type: 'validator',
          context: '0x'
        })
      }

      if (!isAccountDeployed || !mockValidatorInstalled) {
        installModules.push({
          address: mockValidator,
          type: 'validator',
          context: '0x'
        })
      }

      await this.installModules(installModules)
      console.log('Account setup completed')
    } catch (error) {
      console.error(`Error ensuring account is ready for grant permissions: ${error}`)
      throw error
    }
  }

  private async isValidatorModuleInstalled(address: Address): Promise<boolean> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    return this.client.isModuleInstalled({
      address,
      type: 'validator',
      account: this.client.account,
      context: '0x'
    })
  }

  private async installModules(
    modules: {
      address: Address
      type: ModuleType
      context: Hex
    }[]
  ): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const userOpHash = await this.client.installModules({
      account: this.client.account,
      modules: modules
    })
    const receipt = await this.bundlerClient.waitForUserOperationReceipt({ hash: userOpHash })
    console.log(`Module installation receipt:`, receipt)
  }
}
