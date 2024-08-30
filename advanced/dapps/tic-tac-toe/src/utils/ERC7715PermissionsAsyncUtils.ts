import { type GrantPermissionsReturnType } from 'viem/experimental'
import { ENTRYPOINT_ADDRESS_V07, getUserOperationHash } from 'permissionless'
import { type UserOperation } from 'permissionless/types'
import { type PublicClient } from 'viem'
import { type Chain } from 'wagmi/chains'
import { bigIntReplacer } from './CommonUtils'
import { createClients } from '../utils/SingletonUtils'
import { signMessage } from 'viem/accounts'
import { Execution, getCallDataWithContext, getNonceWithContext } from './UserOpBuilderUtils'
import { WalletConnectCosigner } from './WalletConnectCosignerUtils'

async function prepareUserOperationWithPermissions(
  publicClient: PublicClient,
  permissions: GrantPermissionsReturnType,
  actions: Execution[]
): Promise<UserOperation<'v0.7'>> {
  if (!permissions) {
    throw new Error('No permissions available')
  }

  const { factory, factoryData, signerData, permissionsContext } = permissions

  if (!signerData?.userOpBuilder || !signerData.submitToAddress || !permissionsContext) {
    throw new Error(`Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`)
  }

  const nonce = await getNonceWithContext(publicClient, {
    userOpBuilderAddress: signerData.userOpBuilder,
    sender: signerData.submitToAddress,
    permissionsContext: permissionsContext as `0x${string}`
  })

  const callData = await getCallDataWithContext(publicClient, {
    userOpBuilderAddress: signerData.userOpBuilder,
    sender: signerData.submitToAddress,
    permissionsContext: permissionsContext as `0x${string}`,
    actions
  })

  const userOp: UserOperation<'v0.7'> = {
    sender: signerData.submitToAddress,
    factory,
    factoryData: factoryData ? (factoryData as `0x${string}`) : undefined,
    nonce,
    callData,
    callGasLimit: BigInt(2000000),
    verificationGasLimit: BigInt(2000000),
    preVerificationGas: BigInt(2000000),
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0),
    signature: '0x'
  }

  return userOp
}

async function signUserOperationWithECDSAKey(args: {
  ecdsaPrivateKey: `0x${string}`
  userOp: UserOperation<'v0.7'>
  permissions: GrantPermissionsReturnType
  chain: Chain
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, userOp, permissions, chain } = args
  if (!permissions) {
    throw new Error('No permissions available')
  }
  const { signerData } = permissions

  if (!signerData?.userOpBuilder || !signerData.submitToAddress) {
    throw new Error(`Invalid permissions ${JSON.stringify(permissions, bigIntReplacer)}`)
  }

  const userOpHash = getUserOperationHash({
    userOperation: userOp,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chainId: chain.id
  })

  const dappSignatureOnUserOp = await signMessage({
    privateKey: ecdsaPrivateKey,
    message: { raw: userOpHash }
  })

  return dappSignatureOnUserOp
}

export async function executeActionsWithECDSAAndCosignerPermissions(args: {
  ecdsaPrivateKey: `0x${string}`
  actions: Execution[]
  permissions: GrantPermissionsReturnType
  chain: Chain
  pci: string
}): Promise<`0x${string}`> {
  const { ecdsaPrivateKey, actions, permissions, chain, pci } = args
  const { publicClient, bundlerClient } = createClients(chain)
  const address = permissions.signerData?.submitToAddress
  const caip10Address = `eip155:${chain?.id}:${address}`

  const userOp = await prepareUserOperationWithPermissions(publicClient, permissions, actions)

  const gasPrice = await bundlerClient.getUserOperationGasPrice()
  userOp.maxFeePerGas = gasPrice.fast.maxFeePerGas
  userOp.maxPriorityFeePerGas = gasPrice.fast.maxPriorityFeePerGas

  const signature = await signUserOperationWithECDSAKey({
    ecdsaPrivateKey,
    userOp,
    permissions,
    chain
  })
  userOp.signature = signature

  const walletConnectCosigner = new WalletConnectCosigner()
  const tx = await walletConnectCosigner.coSignUserOperation(caip10Address, {
    pci,
    userOp
  })

  const userOpReceipt = await bundlerClient.waitForUserOperationReceipt({
    hash: tx.userOperationTxHash as `0x${string}`
  })

  if (!userOpReceipt.success) {
    throw new Error(`User operation failed: ${JSON.stringify(userOpReceipt, bigIntReplacer)}`)
  }

  return userOpReceipt.receipt.transactionHash
}
