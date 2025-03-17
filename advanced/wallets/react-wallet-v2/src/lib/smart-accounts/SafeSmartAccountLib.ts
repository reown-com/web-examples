import {
  ENTRYPOINT_ADDRESS_V07,
  SmartAccountClientConfig,
  isSmartAccountDeployed
} from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount, signerToSafeSmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { Address, Hex, createWalletClient, http, toHex } from 'viem'
import { TRUSTED_SMART_SESSIONS_ATTERSTER_ADDRESS } from './builders/SmartSessionUtil'
import {
  SmartSessionGrantPermissionsRequest,
  WalletGrantPermissionsResponse
} from '@reown/appkit-experimental/smart-session'
import { getContext } from './builders/ContextBuilderUtil'
import { Execution, Module } from '@rhinestone/module-sdk'

const {
  SMART_SESSIONS_ADDRESS,
  getTrustAttestersAction,
  getAccount,
  getSmartSessionsValidator,
  findTrustedAttesters,
  installModule
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
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
    grantPermissionsRequestParameters: SmartSessionGrantPermissionsRequest
  ): Promise<WalletGrantPermissionsResponse> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    await this.ensureAccountReadyForGrantPermissions()

    const walletClient = createWalletClient({
      chain: this.chain,
      account: this.signer,
      transport: http()
    })
    console.log('walletClient chainId:', walletClient.chain.id)

    const permissionContext = await getContext(this.publicClient, walletClient, {
      account: getAccount({
        address: this.client.account.address,
        type: 'safe'
      }),
      grantPermissionsRequest: grantPermissionsRequestParameters
    })

    console.log(`Returning the permissions request`)
    return {
      ...grantPermissionsRequestParameters,
      context: permissionContext as Hex,
      chainId: toHex(this.chain.id),
      accountMeta: {
        factory: (await this.client.account.getFactory()) || '0x',
        factoryData: (await this.client.account.getFactoryData()) || '0x'
      },
      expiry: grantPermissionsRequestParameters.expiry
    }
  }

  /**
   * Check Safe7579 Account is ready for processing this RPC request
   * - Check Account is deployed
   * - Check SmartSession Attesters are trusted
   * - Check Permission Validator & Mock Validator modules are installed
   * If not, Deploy and installed all necessary module and enable trusted attester if not trusted for processing this RPC request
   * @returns
   */
  private async ensureAccountReadyForGrantPermissions(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    try {
      const setUpSmartAccountForSmartSession: Execution[] = []

      const [isAccountDeployed, isSmartAccountTrustSmartSessionAttesters] = await Promise.all([
        isSmartAccountDeployed(this.publicClient, this.client.account.address),
        this.isSmartAccountTrustSmartSessionAttesters()
      ])

      let smartSessionValidatorInstalled = false
      if (isAccountDeployed) {
        smartSessionValidatorInstalled = await this.isValidatorModuleInstalled(
          SMART_SESSIONS_ADDRESS as Address
        )
      }

      if (
        isAccountDeployed &&
        smartSessionValidatorInstalled &&
        isSmartAccountTrustSmartSessionAttesters
      ) {
        console.log('Account is already set up with required modules')
        return
      }

      console.log('Setting up the Account with required modules')

      if (!isAccountDeployed || !smartSessionValidatorInstalled) {
        const smartSessionValidator: Module = getSmartSessionsValidator({})
        const installSmartSessionValidatorAction = await installModule({
          client: this.publicClient,
          account: getAccount({
            address: this.client.account.address,
            type: 'safe'
          }),
          module: smartSessionValidator
        })

        setUpSmartAccountForSmartSession.push(installSmartSessionValidatorAction[0])
      }

      if (!isSmartAccountTrustSmartSessionAttesters) {
        console.log('Smart Account do not trusted the attesters of the smartsessions module')
        console.log('Enable trusting the attesters of the smartsessions module')
        const trustAttestersAction = getTrustAttestersAction({
          attesters: [TRUSTED_SMART_SESSIONS_ATTERSTER_ADDRESS],
          threshold: 1
        })
        setUpSmartAccountForSmartSession.push(trustAttestersAction)
      }

      console.log('Setting up the Account with Executions', { setUpSmartAccountForSmartSession })
      const userOpHash = await this.sendBatchTransaction(
        setUpSmartAccountForSmartSession.map(action => {
          return {
            to: action.target,
            value: action.value.valueOf(),
            data: action.callData
          }
        })
      )
      const receipt = await this.bundlerClient.waitForUserOperationReceipt({ hash: userOpHash })
      console.log(`Account setup receipt:`, receipt)
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

  private async isSmartAccountTrustSmartSessionAttesters(): Promise<boolean> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }

    const attesters = await findTrustedAttesters({
      client: this.publicClient,
      accountAddress: this.client.account.address
    })

    if (attesters.length > 0) {
      return Boolean(
        attesters.find(
          (attester: Address) =>
            attester.toLowerCase() === TRUSTED_SMART_SESSIONS_ATTERSTER_ADDRESS.toLowerCase()
        )
      )
    }

    return false
  }
}
