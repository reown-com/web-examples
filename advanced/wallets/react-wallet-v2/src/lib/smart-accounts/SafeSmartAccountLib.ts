import {
  ENTRYPOINT_ADDRESS_V07,
  SmartAccountClientConfig,
  UserOperation,
  getPackedUserOperation,
  isSmartAccountDeployed
} from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount, signerToSafeSmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import {
  Address,
  Hex,
  WalletGrantPermissionsParameters,
  WalletGrantPermissionsReturnType,
  encodeAbiParameters,
  encodePacked,
  serializeSignature
} from 'viem'
import { publicKeyToAddress, sign } from 'viem/accounts'
import {
  MOCK_VALIDATOR_ADDRESS,
  PERMISSION_VALIDATOR_ADDRESS,
  SAFE7579_USER_OPERATION_BUILDER_ADDRESS
} from '@/utils/permissionValidatorUtils/constants'
import { MultiKeySigner } from 'viem/_types/experimental/erc7715/types/signer'
import { KEY_TYPES, bigIntReplacer, decodeDIDToPublicKey } from '@/utils/HelperUtil'
import { isModuleInstalledAbi } from '@/utils/ERC7579AccountUtils'
import { parsePublicKey as parsePasskeyPublicKey } from 'webauthn-p256'
import { enableSessionAbi } from '@/utils/permissionValidatorUtils/abi'
import {
  generateSignerId,
  getDigest,
  getEOAAndPasskeySignerInitData,
  getPermissionContext,
  perpareMockWCCosignerEnableSession
} from '@/utils/permissionValidatorUtils'

export class SafeSmartAccountLib extends SmartAccountLib {
  protected ERC_7579_LAUNCHPAD_ADDRESS: Address = '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'
  protected SAFE_4337_MODULE_ADDRESS: Address = '0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2'

  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    this.type = 'Safe'
    const safeAccount = await signerToSafeSmartAccount(this.publicClient, {
      safeVersion: '1.4.1',
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      safe4337ModuleAddress: this.SAFE_4337_MODULE_ADDRESS,
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

  async sendTransaction({ to, value, data }: { to: Address; value: bigint | Hex; data: Hex }) {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const txResult = await this.client.sendTransaction({
      to,
      value: BigInt(value),
      data,
      account: this.client.account,
      chain: this.chain
    })
    return txResult
  }

  async sendBatchTransaction(calls: { to: Address; value: bigint; data: Hex }[]) {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }

    const userOp = (await this.client.prepareUserOperationRequest({
      userOperation: {
        callData: await this.client.account.encodeCallData(calls)
      },
      account: this.client.account
    })) as UserOperation<'v0.7'>

    const newSignature = await this.client.account.signUserOperation(userOp)
    userOp.signature = newSignature

    const packedUserOp = getPackedUserOperation(userOp)

    console.log('Final Packed UserOp to send', JSON.stringify(packedUserOp, bigIntReplacer))

    const userOpHash = await this.bundlerClient.sendUserOperation({
      userOperation: userOp
    })

    return userOpHash
  }

  async manageModule(calls: { to: Address; value: bigint; data: Hex }[]) {
    const userOpHash = await this.sendBatchTransaction(calls)
    return await this.bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash
    })
  }

  async grantPermissions(
    grantPermissionsRequestParams: WalletGrantPermissionsParameters
  ): Promise<WalletGrantPermissionsReturnType> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }

    await this.ensureAccountDeployed()
    await this.ensurePermissionValidatorInstalled()
    await this.ensureMockSignatureValidatorInstalled()
    const requestedSigner = grantPermissionsRequestParams.signer
    const requestedPermissions = grantPermissionsRequestParams.permissions
    if (!requestedSigner || requestedSigner.type !== 'keys') {
      throw new Error('Currently only supporting KeySigner and MultiKey Type for permissions')
    }
    const typeSigner = requestedSigner as MultiKeySigner
    const publicKeys = typeSigner.data.ids.map(id => decodeDIDToPublicKey(id))
    let eoaPublicKey, passkeyPublicKey
    publicKeys.forEach(key => {
      if (key.keyType === KEY_TYPES.secp256k1) {
        eoaPublicKey = key.key
      }
      if (key.keyType === KEY_TYPES.secp256r1) {
        passkeyPublicKey = key.key
      }
    })
    if (!eoaPublicKey || !passkeyPublicKey) throw Error('Invalid EOA and passkey signers')
    const targetEOAAddress = publicKeyToAddress(eoaPublicKey as `0x${string}`)
    const parsedPasskeyPublicKey = parsePasskeyPublicKey(passkeyPublicKey as `0x${string}`)
    const encodedSignersInitData = getEOAAndPasskeySignerInitData(targetEOAAddress, {
      pubKeyX: parsedPasskeyPublicKey.x,
      pubKeyY: parsedPasskeyPublicKey.y
    })
    const enableSession = perpareMockWCCosignerEnableSession(encodedSignersInitData)
    const signerId = generateSignerId(grantPermissionsRequestParams)
    const enableSessionHash = await getDigest(this.publicClient, {
      signerId,
      accountAddress: this.client.account.address,
      enableSession: enableSession
    })
    const signature = await sign({
      privateKey: this.getPrivateKey() as `0x${string}`,
      hash: enableSessionHash
    })
    const enableSessionSignature: Hex = serializeSignature(signature)
    const permissionContext = getPermissionContext(signerId, enableSession, enableSessionSignature)
    console.log({ permissionContext })
    console.log('Granting permissions...')

    return {
      permissionsContext: permissionContext,
      grantedPermissions: grantPermissionsRequestParams.permissions,
      expiry: grantPermissionsRequestParams.expiry,
      signerData: {
        userOpBuilder: SAFE7579_USER_OPERATION_BUILDER_ADDRESS,
        submitToAddress: this.client.account.address
      }
    }
  }

  private async ensureAccountDeployed(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const isAccountDeployed = await isSmartAccountDeployed(
      this.publicClient,
      this.client.account.address
    )
    console.log({ isAccountDeployed })

    if (!isAccountDeployed) {
      console.log('Deploying the Account with permission validator')
      await this.deployAccountWithPermissionValidator()
    }
  }

  private async deployAccountWithPermissionValidator(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const deployAccountUserOpHash = await this.client.installModule({
      account: this.client.account,
      address: PERMISSION_VALIDATOR_ADDRESS,
      context: '0x',
      type: 'validator'
    })
    const deployAccountReceipt = await this.bundlerClient.waitForUserOperationReceipt({
      hash: deployAccountUserOpHash
    })
    console.log({ deployAccountReceipt })
  }

  private async ensurePermissionValidatorInstalled(): Promise<void> {
    const isInstalled = await this.isPermissionValidatorModuleInstalled()
    console.log({ isInstalled })

    if (!isInstalled) {
      console.log('Installing the PermissionValidator Module')
      await this.installPermissionValidatorModule()
    }
  }
  private async ensureMockSignatureValidatorInstalled(): Promise<void> {
    const isMockSignatureModuleInstalled = await this.isMockSignatureValidatorModuleInstalled()
    console.log({ isMockSignatureModuleInstalled })

    if (!isMockSignatureModuleInstalled) {
      console.log('Installing the MockSignature Module')
      await this.installMockSignatureValidatorModule()
    }
  }
  private async installPermissionValidatorModule(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const installModuleUserOpHash = await this.client.installModule({
      account: this.client.account,
      address: PERMISSION_VALIDATOR_ADDRESS,
      context: '0x',
      type: 'validator'
    })
    const installModuleReceipt = await this.bundlerClient.waitForUserOperationReceipt({
      hash: installModuleUserOpHash
    })
    console.log({ installModuleReceipt })
  }
  private async installMockSignatureValidatorModule(): Promise<void> {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    const installMockSignatureModuleUserOpHash = await this.client.installModule({
      account: this.client.account,
      address: MOCK_VALIDATOR_ADDRESS,
      context: '0x',
      type: 'validator'
    })
    const installMockSignatureModuleReceipt = await this.bundlerClient.waitForUserOperationReceipt({
      hash: installMockSignatureModuleUserOpHash
    })
    console.log({ installMockSignatureModuleReceipt })
  }

  private async isPermissionValidatorModuleInstalled() {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    return await this.publicClient.readContract({
      address: this.client.account.address,
      abi: isModuleInstalledAbi,
      functionName: 'isModuleInstalled',
      args: [
        BigInt(1), // ModuleType
        PERMISSION_VALIDATOR_ADDRESS, // Module Address
        '0x' // Additional Context
      ]
    })
  }

  private async isMockSignatureValidatorModuleInstalled() {
    if (!this.client?.account) {
      throw new Error('Client not initialized')
    }
    return await this.publicClient.readContract({
      address: this.client.account.address,
      abi: isModuleInstalledAbi,
      functionName: 'isModuleInstalled',
      args: [
        BigInt(1), // ModuleType
        MOCK_VALIDATOR_ADDRESS, // Module Address
        '0x' // Additional Context
      ]
    })
  }
}
