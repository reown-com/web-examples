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
  encodeFunctionData,
  getAddress,
  http,
  parseAbi,
  type WalletGrantPermissionsReturnType
} from 'viem'
import { MultiKeySigner } from 'viem/_types/experimental/erc7715/types/signer'
import { ModuleType } from 'permissionless/actions/erc7579'
import {
  MOCK_VALIDATOR_ADDRESSES,
  TRUSTED_SMART_SESSIONS_ATTERSTER_ADDRESS
} from './builders/SmartSessionUtil'
import { Permission } from '@/data/EIP7715Data'
import { getSmartSessionContext } from './builders/ContextBuilderUtil'
import { readContract } from 'viem/actions'
import { Execution, Module } from '@rhinestone/module-sdk'

const {
  SMART_SESSIONS_ADDRESS,
  REGISTRY_ADDRESS,
  getTrustAttestersAction,
  getAccount,
  getSmartSessionsValidator
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
    console.log('walletClient chainId:', walletClient.chain.id)
    let permissionContext = '0x'
    try {
      permissionContext = await getSmartSessionContext({
        walletClient,
        account: getAccount({
          address: this.client.account.address,
          type: 'safe'
        }),
        permissions: [...grantPermissionsRequestParameters.permissions] as unknown as Permission[],
        expiry: grantPermissionsRequestParameters.expiry,
        signer: grantPermissionsRequestParameters.signer as MultiKeySigner
      })
    } catch (error) {
      console.error(`Error getting permission context: ${error}`)
      throw error
    }

    console.log(`Returning the permissions request`)
    return {
      permissionsContext: permissionContext,
      grantedPermissions: grantPermissionsRequestParameters.permissions,
      expiry: grantPermissionsRequestParameters.expiry,
      signerData: {
        submitToAddress: this.client.account.address
      }
    } as WalletGrantPermissionsReturnType
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

      const [isAccountDeployed, doesSmartAccountTrustSmartSessionAttesters] = await Promise.all([
        isSmartAccountDeployed(this.publicClient, this.client.account.address),
        this.isSmartAccountTrustSmartSessionAttesters()
      ])

      let smartSessionValidatorInstalled = false
      let mockValidatorInstalled = false
      console.log(`SmartSession Address: ${SMART_SESSIONS_ADDRESS}`)
      console.log(`mockValidator Address: ${MOCK_VALIDATOR_ADDRESSES[this.chain.id]}`)
      if (isAccountDeployed) {
        ;[smartSessionValidatorInstalled, mockValidatorInstalled] = await Promise.all([
          this.isValidatorModuleInstalled(SMART_SESSIONS_ADDRESS as Address),
          this.isValidatorModuleInstalled(MOCK_VALIDATOR_ADDRESSES[this.chain.id] as Address)
        ])
      }
      console.log({ smartSessionValidatorInstalled, mockValidatorInstalled })

      if (
        isAccountDeployed &&
        smartSessionValidatorInstalled &&
        mockValidatorInstalled &&
        doesSmartAccountTrustSmartSessionAttesters
      ) {
        console.log('Account is already set up with required modules')
        return
      }

      console.log('Setting up the Account with required modules')

      if (!isAccountDeployed || !smartSessionValidatorInstalled) {
        const smartSessionValidator: Module = {
          module: SMART_SESSIONS_ADDRESS,
          type: 'validator'
        }
        const installSmartSessionValidatorAction = this.getInstallModuleAction(
          this.client.account.address,
          smartSessionValidator
        )
        setUpSmartAccountForSmartSession.push(installSmartSessionValidatorAction)
      }

      if (!isAccountDeployed || !mockValidatorInstalled) {
        const mockSignatureValidator: Module = {
          module: MOCK_VALIDATOR_ADDRESSES[this.chain.id],
          type: 'validator'
        }
        const installMockSignatureValidatorAction = this.getInstallModuleAction(
          this.client.account.address,
          mockSignatureValidator
        )
        setUpSmartAccountForSmartSession.push(installMockSignatureValidatorAction)
      }

      if (!doesSmartAccountTrustSmartSessionAttesters) {
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

  private getInstallModuleAction(accountAddress: Address, module: Module): Execution {
    return {
      target: accountAddress,
      value: BigInt(0),
      callData: encodeFunctionData({
        abi: [
          {
            name: 'installModule',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              {
                type: 'uint256',
                name: 'moduleTypeId'
              },
              {
                type: 'address',
                name: 'module'
              },
              {
                type: 'bytes',
                name: 'initData'
              }
            ],
            outputs: []
          }
        ],
        functionName: 'installModule',
        args: [
          this.parseModuleTypeId(module.type),
          getAddress(module.module),
          module.initData || '0x'
        ]
      })
    }
  }

  private async isSmartAccountTrustSmartSessionAttesters(): Promise<boolean> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }

    const attesters = await readContract(this.publicClient, {
      address: REGISTRY_ADDRESS,
      abi: parseAbi([
        'function findTrustedAttesters(address smartAccount) view returns (address[])'
      ]),
      functionName: 'findTrustedAttesters',
      args: [this.client.account.address]
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

  private parseModuleTypeId(type: ModuleType): bigint {
    switch (type) {
      case 'validator':
        return BigInt(1)
      case 'executor':
        return BigInt(2)
      case 'fallback':
        return BigInt(3)
      case 'hook':
        return BigInt(4)
      default:
        throw new Error('Invalid module type')
    }
  }
}
