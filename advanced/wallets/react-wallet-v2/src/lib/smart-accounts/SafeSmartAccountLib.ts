import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07, SmartAccountClientConfig, UserOperation, getAccountNonce, getUserOperationHash, isSmartAccountDeployed } from 'permissionless'
import { SmartAccountLib } from './SmartAccountLib'
import { SmartAccount } from 'permissionless/accounts'
import { EntryPoint } from 'permissionless/types/entrypoint'
import { signerToSafe7579SmartAccount } from '@/utils/safe7579AccountUtils/signerToSafe7579SmartAccount'
import { Address, Hex, concatHex, encodeAbiParameters, encodePacked, keccak256, pad, parseAbiParameter, parseAbiParameters, zeroAddress } from 'viem'
import { isModuleInstalledAbi } from '@/utils/safe7579AccountUtils/abis/Account'
import { generatePrivateKey, privateKeyToAccount, signMessage } from 'viem/accounts'
import { getChainId } from 'viem/actions'
import { ethers } from 'ethers'

export type SingleSignerPermission = {
  validUntil: bigint,
  validAfter: bigint,
  signatureValidationAlgorithm: Address,
  signer: Address,
  policy: Address,
  policyData: `0x${string}`
}

export class SafeSmartAccountLib extends SmartAccountLib {
  async getClientConfig(): Promise<SmartAccountClientConfig<EntryPoint>> {
    if (this.entryPoint === ENTRYPOINT_ADDRESS_V06) {
      throw new Error('Only entrypoint V7 is supported')
    }

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
        // sponsorUserOperation: this.sponsored ? this.paymasterClient.sponsorUserOperation : undefined
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
    // testing sending transaction for permissionValidation Module
    await this.testSimplePermissionValidatorTransaction({ to, value, data })
    
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

  async testSimplePermissionValidatorTransaction({ to, value, data }: { to: Address; value: bigint; data: Hex }){
    if (!this.client || !this.client.account) {
      throw new Error('Client not initialized')
    }
    const permissionValidatorAddress = '0x6671AD9ED29E2d7a894E80bf48b7Bf03Ee64A0f4';

    const isModuleInstalled = (await this.publicClient.readContract({
      address: this.client.account.address,
      abi: isModuleInstalledAbi,
      functionName: "isModuleInstalled",
      args: [
        BigInt(1),  // ModuleType
        permissionValidatorAddress, // Module Address
        "0x"    // Additional Context
      ],
    }));
    console.log(`isModuleInstalled : ${isModuleInstalled}`)
    
    const nonce = await this.getPermissionValidatorNonce(permissionValidatorAddress)
    console.log('PermissionValidator Nonce: ',nonce)

    const testDappPrivateKey = generatePrivateKey();
    const dappAccount = privateKeyToAccount(testDappPrivateKey)
    console.log("dappAccount(permitted Signer) Address: ",dappAccount.address)

    const {permissionData,permissions,signatureOnPermissionData,} = await this.issuePermissionData('',dappAccount.address)
    console.log({permissionData,permissions,signatureOnPermissionData,})
    
    const gasPrice = await this.client.getUserOperationGasPrice();

    const userOp:UserOperation<"v0.7"> = {
      sender: this.client.account.address,
      nonce: nonce,
      factory: await this.client.account.getFactory(),
      factoryData:await this.client.account.getFactoryData(),
      callData: await this.client.account.encodeCallData({ to, value, data }),
      callGasLimit: BigInt(20000000),
      verificationGasLimit:BigInt(20000000),
      preVerificationGas:BigInt(20000000),
      maxFeePerGas: gasPrice.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.fast.maxPriorityFeePerGas,
      signature: '0x'
    }
    
    const userOpHash = getUserOperationHash({
      userOperation: {
          ...userOp,
          signature: "0x"
      },
      entryPoint: this.entryPoint,
      chainId: await getChainId(this.publicClient)
    })
    console.log('userOperation :',userOp)
    console.log('userOpHash : ',userOpHash)

    const dappSigningUserOp = await dappAccount.signMessage({
      message:{raw: userOpHash}
    })
    console.log('dappSigningUserOp : ',dappSigningUserOp)

    const finalSigForValidator = await this.getPermissionValidatorSignature(dappSigningUserOp,permissions,dappAccount.address)
    console.log('finalSigForValidator : ',finalSigForValidator)
    userOp.signature = finalSigForValidator

    const _userOpHash = await this.bundlerClient.sendUserOperation({
    userOperation: userOp
    })
    return _userOpHash;
  }

  async issuePermissionData(approvedPermissions:any,permittedSignerAddress:Address){
    const sigValidatorAlgo:Address = '0x033f60A1035E64c96FD511abA61bA8d9276ADB4f' // deployed Secp256K1 Signature Validator contract
    // this permission have dummy policy for now,
    // for now it is giving access to execute any operation,
    //  bc current version of PermissionValidator module don't consider checking policy 
    const permissions:SingleSignerPermission[] = [{
      validUntil: BigInt(0),
      validAfter: BigInt(0),
      signatureValidationAlgorithm: sigValidatorAlgo,
      signer: permittedSignerAddress,
      policy: zeroAddress, // this is just to set a value 
      policyData: "0x"
    }];
    // PermissionId is keccakHash of permission Object
    const permissionIds:Hex[] = []
    for (let i = 0; i < permissions.length; i++) {
      permissionIds[i] = this.getPermissionId(permissions[i])
    }
    /**
     * permissionEnableData = 
     * [PermissionArrayLength] ----------- [uint8]
     * [ChainIds] ------------------------ [chainIdsArray.length * uint64]
     * [permissionIds] ------------------- [permissionIds[]]
     * example: PermissionArrayLength = 1, chainId Array length = 1 , permissionIds ArrayLength = 1
     * permissionEnableData = 0x [01][0000000000aa36a7][permissionId]
     */
    let permissionEnableData:`0x${string}` = encodePacked(['uint8'],
        [permissions.length]
    );
    // considering permission is on same chain
    const chainIds = [BigInt(this.chain.id)]
    for (let i = 0; i < chainIds.length; ++i) {
      permissionEnableData = encodePacked(['bytes','uint64'],
         [ permissionEnableData,
          chainIds[i]]
      );
    }
    permissionEnableData = encodePacked(['bytes','bytes[]'],[permissionEnableData, permissionIds]);

    let erc1271Signature: Hex = await signMessage({
      privateKey: this.getPrivateKey() as `0x${string}`,
      message:{raw:concatHex([keccak256(permissionEnableData), permittedSignerAddress])}
    })

    return {
      permissions:permissions,
      permissionData : permissionEnableData,
      signatureOnPermissionData : erc1271Signature,
    };
  }

  async getPermissionValidatorSignature(userOpSignature:`0x${string}`,approvedPermissions:any,permittedSignerAddress:Address){
    const {permissionData,permissions,signatureOnPermissionData} = await this.issuePermissionData(approvedPermissions,permittedSignerAddress)
    const _permissionIndex = BigInt(0);
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['uint256',"tuple(uint48,uint48,address,bytes,address,bytes)","bytes","bytes","bytes"],
      [ _permissionIndex,
        [0, 0, permissions[0].signatureValidationAlgorithm, permissions[0].signer, permissions[0].policy, permissions[0].policyData],
        permissionData,
        signatureOnPermissionData,
        userOpSignature
      ]
    ) as `0x${string}` 
    
    return encodePacked(['uint8','bytes'], [1, encodedData] );
  }

  async getPermissionValidatorNonce(permissionValidatorAddress:Address){
    return await getAccountNonce(this.publicClient, {
      sender: this.client!.account!.address,
      entryPoint: this.entryPoint,
      key: BigInt(
        pad(permissionValidatorAddress, {
          dir: "right",
          size: 24,
        }) || 0
      ),
    });
  } 

  getPermissionId = (permission:SingleSignerPermission):`0x${string}` =>{
    return keccak256(
      encodePacked(
        ['uint256','uint256','address','address','address','bytes'],
        [
          permission.validUntil, 
          permission.validAfter, 
          permission.signatureValidationAlgorithm, 
          permission.signer, 
          permission.policy, 
          permission.policyData
        ]
      )
    )
  }
}