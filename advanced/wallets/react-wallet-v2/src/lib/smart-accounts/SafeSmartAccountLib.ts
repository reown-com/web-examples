import { ENTRYPOINT_ADDRESS_V07, SmartAccountClientConfig, isSmartAccountDeployed } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { signerToSafe7579SmartAccount } from '@/utils/safe7579AccountUtils/signerToSafe7579SmartAccount'
import { Address, Hex, concatHex, keccak256, zeroAddress } from 'viem'
import { signMessage } from 'viem/accounts'
import { PERMISSION_VALIDATOR_ADDRESS, SECP256K1_SIGNATURE_VALIDATOR_ADDRESS } from '@/utils/permissionValidatorUtils/constants'
import { PermissionContext, SingleSignerPermission, getPermissionScopeData } from '@/utils/permissionValidatorUtils'


export class SafeSmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    this.entryPoint = ENTRYPOINT_ADDRESS_V07

    const safeAccount = await signerToSafe7579SmartAccount(this.publicClient, {
      entryPoint: this.entryPoint,
      signer: this.signer,
    })
    return {
      name:'Safe7579SmartAccount',
      account: safeAccount as SmartAccount<EntryPoint>,
      entryPoint: this.entryPoint,
      chain: this.chain,
      bundlerTransport: this.bundlerUrl,
      middleware: {
        gasPrice: async () => (await this.bundlerClient.getUserOperationGasPrice()).fast, // use pimlico bundler to get gas prices
        sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
      }
    }
  } 

  async sendTransaction({ to, value, data }: { to: Address; value: bigint; data: Hex }) {
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const accountDeployed = await isSmartAccountDeployed(this.publicClient,this.client.account.address)
    /**
     * this is just a temporary fix for safe7579 modular account
     * is safe7579Account is not depoyed then need to create 
     * one useroperation which first deploy and setup the account ,
     * second user operation will be used to call the desired actions 
     * */ 
    if(!accountDeployed){
      const setUpUserOp = await this.client.prepareUserOperationRequest({
        userOperation: {
          callData: await this.client.account.encodeCallData({ to, value, data }),
        },
        account: this.client.account,
        })
        const newSignature = await this.client.account.signUserOperation(setUpUserOp)

        setUpUserOp.signature = newSignature

        const setUpUserOpHash = await this.bundlerClient.sendUserOperation({
        userOperation: setUpUserOp
        })
        const txHash = await this.bundlerClient.waitForUserOperationReceipt({
          hash:setUpUserOpHash
        })
    }
   
    const txResult = await this.client.sendTransaction({
      to,
      value,
      data,
      account: this.client.account,
      chain: this.chain
    })

    return txResult
  }

  async sendBatchTransaction(args:{
    to: Address;
    value: bigint;
    data: Hex;
  }[]) {
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const accountDeployed = await isSmartAccountDeployed(this.publicClient,this.client.account.address)
    if(!accountDeployed){
      const setUpUserOp = await this.client.prepareUserOperationRequest({
        userOperation: {
          callData: await this.client.account.encodeCallData(args),
        },
        account: this.client.account,
        })
        const newSignature = await this.client.account.signUserOperation(setUpUserOp)
        setUpUserOp.signature = newSignature

        const setUpUserOpHash = await this.bundlerClient.sendUserOperation({
        userOperation: setUpUserOp
        })
        const txHash = await this.bundlerClient.waitForUserOperationReceipt({
          hash:setUpUserOpHash
        })
    }

    const userOp = await this.client.prepareUserOperationRequest({
    userOperation: {
      callData: await this.client.account.encodeCallData(args)
    },
    account: this.client.account
    })

    const newSignature = await this.client.account.signUserOperation(userOp)
    userOp.signature = newSignature

    const userOpHash = await this.bundlerClient.sendUserOperation({
    userOperation: userOp
    })
    return userOpHash;

  }

  async issuePermissionContext(targetAddress:Address,approvedPermissions:any):Promise<PermissionContext>{
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    // this permission have dummy policy set to zeroAddress for now,
    // bc current version of PermissionValidator_v1 module don't consider checking policy 
    const permissions:SingleSignerPermission[] = [{
      validUntil: 0,
      validAfter: 0,
      signatureValidationAlgorithm:SECP256K1_SIGNATURE_VALIDATOR_ADDRESS,
      signer: targetAddress,
      policy: zeroAddress, 
      policyData: "0x"
    }];
    
    const permittedScopeData = getPermissionScopeData(permissions,this.chain)
    // the smart account sign over the permittedScope and targetAddress
    const permittedScopeSignature: Hex = await signMessage({
      privateKey: this.getPrivateKey() as `0x${string}`,
      message:{raw:concatHex([keccak256(permittedScopeData), targetAddress
      ])}
    })

    return {
      accountAddress:this.client.account.address,
      permissionValidatorAddress:PERMISSION_VALIDATOR_ADDRESS,
      permissions:permissions,
      permittedScopeData : permittedScopeData,
      permittedScopeSignature : permittedScopeSignature
    };
  }
  
}