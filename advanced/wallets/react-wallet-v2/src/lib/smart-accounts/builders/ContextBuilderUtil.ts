import { MULTIKEY_SIGNER_ADDRESSES, TIME_FRAME_POLICY_ADDRESSES } from './SmartSessionUtil'
import type { Session, ChainSession, Account, ActionData } from '@rhinestone/module-sdk'
const {
  SMART_SESSIONS_ADDRESS,
  SmartSessionMode,
  encode1271Hash,
  getPermissionId,
  getSessionDigest,
  getSessionNonce,
  encodeSmartSessionSignature,
  hashChainSessions
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
import {
  type Hex,
  PublicClient,
  type WalletClient,
  concat,
  encodeAbiParameters,
  encodePacked,
  getAbiItem,
  toBytes,
  toFunctionSelector,
  toHex
} from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { parsePublicKey as parsePasskeyPublicKey } from 'webauthn-p256'
import {
  MultiKeySigner,
  Permission,
  Signer,
  WalletGrantPermissionsRequest,
  ContractCallPermission,
  SignerKeyType
} from '@/data/EIP7715Data'

// Constants for error messages
const ERROR_MESSAGES = {
  CHAIN_UNDEFINED: 'getContext: chain is undefined',
  MISMATCHED_CHAIN_ID: 'getContext: chain mismatch',
  ACCOUNT_UNDEFINED: 'getContext: Wallet account is undefined',
  CONTRACT_ADDRESS_UNDEFINED: 'Contract address is undefined',
  FUNCTIONS_UNDEFINED: 'Functions is undefined',
  UNSUPPORTED_SIGNER_TYPE: 'Unsupported signer type',
  INVALID_SIGNATURE: 'Invalid signature',
  FUNCTION_ABI_NOT_FOUND: (functionName: string) =>
    `Function ABI not found for function: ${functionName}`,
  UNSUPPORTED_KEY_TYPE: (keyType: string) => `Unsupported key type: ${keyType}`,
  UNSUPPORTED_PERMISSION_TYPE: (permissionType: string) =>
    `Unsupported permission type: ${permissionType}. Only 'contract-call' is allowed.`
}
// 32 byte salt for the session
const SESSION_SALT = toHex(toBytes('1', { size: 32 }))

// Build a ChainSession from given parameters
function buildChainSession(
  chainId: number,
  session: Session,
  accountAddress: Hex,
  sessionNonce: bigint
): ChainSession {
  return {
    chainId: BigInt(chainId),
    session: {
      ...session,
      account: accountAddress,
      smartSession: SMART_SESSIONS_ADDRESS,
      mode: parseInt(SmartSessionMode.ENABLE, 16),
      nonce: sessionNonce
    }
  }
}

// Fetch session data using the WalletClient
async function fetchSessionData(
  publicClient: PublicClient,
  account: Account,
  session: Session
): Promise<{ sessionNonce: bigint; sessionDigest: Hex; permissionId: Hex }> {
  const permissionId = (await getPermissionId({ client: publicClient, session })) as Hex
  const sessionNonce = await getSessionNonce({ client: publicClient, account, permissionId })
  const sessionDigest = await getSessionDigest({
    client: publicClient,
    account,
    session,
    mode: SmartSessionMode.ENABLE,
    permissionId
  })

  return { sessionNonce, sessionDigest, permissionId }
}

/**
 *  1. Check if walletClient account is defined,
 *   Note - currently walletClient account is the smartAccountSigner address not smartAccount
 *  2. Check if walletClient chain is same as permissions request chain
 *
 * @param walletClient
 * @param param
 * @returns
 */
export async function getContext(
  publicClient: PublicClient,
  walletClient: WalletClient,
  {
    account,
    grantPermissionsRequest
  }: { account: Account; grantPermissionsRequest: WalletGrantPermissionsRequest }
): Promise<Hex> {
  if (!walletClient.account) throw new Error(ERROR_MESSAGES.ACCOUNT_UNDEFINED)

  const { chainId: hexChainId } = grantPermissionsRequest
  console.log('walletClient.chain:', walletClient.chain)
  console.log('publicClient.chain:', publicClient.chain)
  console.log('hexChainId:', hexChainId)
  if (!walletClient.chain || !publicClient.chain || !hexChainId)
    throw new Error(ERROR_MESSAGES.CHAIN_UNDEFINED)
  if (toHex(walletClient.chain.id) !== hexChainId || toHex(publicClient.chain.id) !== hexChainId)
    throw new Error(ERROR_MESSAGES.MISMATCHED_CHAIN_ID)

  const session: Session = getSmartSession(grantPermissionsRequest)

  // Fetch session data
  const { sessionNonce, sessionDigest, permissionId } = await fetchSessionData(
    publicClient,
    account,
    session
  )

  // Build chain session and hash it
  const chainSession = buildChainSession(
    walletClient.chain.id,
    session,
    account.address,
    sessionNonce
  )
  const chainSessionHash = hashChainSessions([chainSession])

  // Encode chain session hash
  const encodedChainSessionHash = encode1271Hash({
    account,
    chainId: walletClient.chain.id,
    validator: account.address,
    hash: chainSessionHash
  })

  // Validate wallet account
  if (!walletClient.account) throw new Error(ERROR_MESSAGES.ACCOUNT_UNDEFINED)

  // Sign the message
  const encodedChainSessionSignature = await walletClient.signMessage({
    account: walletClient.account,
    message: { raw: toBytes(encodedChainSessionHash) }
  })

  // Adjust the signature
  const permissionEnableSignature = adjustVInSignature('eth_sign', encodedChainSessionSignature)
  const encodedSmartSessionSignature = encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: '0x',
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: [{ chainId: BigInt(walletClient.chain.id), sessionDigest }],
        sessionToEnable: session,
        permissionEnableSig: permissionEnableSignature
      },
      validator: account.address,
      accountType: account.type
    }
  })

  // Return the encoded packed data - this is the permission context which will be used for preparing the calls
  return encodePacked(['address', 'bytes'], [SMART_SESSIONS_ADDRESS, encodedSmartSessionSignature])
}

// Adjust the V value in the signature
const adjustVInSignature = (
  signingMethod: 'eth_sign' | 'eth_signTypedData',
  signature: string
): Hex => {
  const ETHEREUM_V_VALUES = [0, 1, 27, 28]
  const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27

  let signatureV = Number.parseInt(signature.slice(-2), 16)

  // Validate V value
  if (!ETHEREUM_V_VALUES.includes(signatureV)) throw new Error(ERROR_MESSAGES.INVALID_SIGNATURE)

  // Adjust the signature based on the signing method
  if (signingMethod === 'eth_sign') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
    signatureV += 4
  } else if (signingMethod === 'eth_signTypedData') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
  }

  // Return the adjusted signature
  return (signature.slice(0, -2) + signatureV.toString(16)) as Hex
}

/**
 * This method transforms the WalletGrantPermissionsRequest into a Session object
 * The Session object includes permittied actions and policies.
 * It also includes the Session Validator Address(MultiKeySigner module) and Init Data needed for setting up the module.
 * @param WalletGrantPermissionsRequest
 * @returns
 */
function getSmartSession({
  chainId,
  expiry,
  permissions,
  signer
}: WalletGrantPermissionsRequest): Session {
  const chainIdNumber = parseInt(chainId, 16)
  const actions = getActionsFromPermissions(permissions, chainIdNumber, expiry)

  const sessionValidator = getSessionValidatorAddress(signer, chainIdNumber)
  const sessionValidatorInitData = getSessionValidatorInitData(signer)

  return {
    sessionValidator,
    sessionValidatorInitData,
    salt: SESSION_SALT,
    userOpPolicies: [],
    actions,
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: []
    }
  }
}

// Type Guard for MultiKey Signer
function isMultiKeySigner(signer: Signer): signer is MultiKeySigner {
  return signer.type === 'keys'
}

/**
 *  This method processes the MultiKeySigner object from the permissions request and returns an array of SignerKeyType and data
 * @param signer
 * @returns
 */
function processMultiKeySigner(signer: MultiKeySigner): { type: SignerKeyType; data: string }[] {
  return signer.data.keys.map(key => {
    switch (key.type) {
      case 'secp256k1':
        return {
          type: SignerKeyType.SECP256K1,
          data: publicKeyToAddress(key.publicKey)
        }
      case 'secp256r1':
        const { x, y } = parsePasskeyPublicKey(key.publicKey as Hex)
        return {
          type: SignerKeyType.SECP256R1,
          data: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [x, y])
        }
      default:
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_KEY_TYPE(key.type))
    }
  })
}

/**
 *  Get the Session Validator Address, based on signer type in permissions request
 *  Note - Currently only MultiKeySigner is supported
 */
function getSessionValidatorAddress(signer: Signer, chainId: number): Hex {
  if (isMultiKeySigner(signer)) {
    return MULTIKEY_SIGNER_ADDRESSES[chainId]
  }
  throw new Error(ERROR_MESSAGES.UNSUPPORTED_SIGNER_TYPE)
}

/**
 *  Get the Session Validator Init Data, based on signer type in permissions request
 *  Note - Currently only MultiKeySigner is supported
 *  This method return the init data in a format which can be used to initialize the MultiKeySigner module
 * @param signer
 * @returns
 */
function getSessionValidatorInitData(signer: Signer): Hex {
  if (isMultiKeySigner(signer)) {
    const processedSigners = processMultiKeySigner(signer)
    return encodeMultiKeySignersInitData(processedSigners)
  }
  throw new Error(ERROR_MESSAGES.UNSUPPORTED_SIGNER_TYPE)
}

/**
 * This method encodes the signers array into a format which can be used to initialize the MultiKeySigner module
 * @param signers
 * @returns
 */
function encodeMultiKeySignersInitData(signers: { type: SignerKeyType; data: string }[]): Hex {
  return signers.reduce(
    (encoded, signer) =>
      concat([encoded, encodePacked(['uint8', 'bytes'], [signer.type, signer.data as Hex])]),
    encodePacked(['uint8'], [signers.length]) as Hex
  )
}

// Type Guard for Contract Call Permissions
function isContractCallPermission(permission: Permission): permission is ContractCallPermission {
  return permission.type === 'contract-call'
}

/**
 *  This method processes the permissions array from the permissions request and returns the actions array
 *  Note - Currently only 'contract-call' permission type is supported
 *       - For each contract-call permission, it creates an action for each function in the permission
 *       - It also adds the TIME_FRAME_POLICY for each action as the actionPolicy
 *        - The expiry time indicated in the permissions request is used as the expiry time for the actions
 *        - Function Arguments are not supported in this version
 * @param permissions - Permissions array from the permissions request
 * @param chainId - Chain ID on which the actions are to be performed
 * @param expiry - Expiry time for the actions
 * @returns
 */
function getActionsFromPermissions(
  permissions: Permission[],
  chainId: number,
  expiry: number
): ActionData[] {
  return permissions.reduce((actions: ActionData[], permission) => {
    if (!isContractCallPermission(permission)) {
      throw new Error(ERROR_MESSAGES.UNSUPPORTED_PERMISSION_TYPE(JSON.stringify(permission)))
    }

    const contractCallActions = createActionForContractCall(permission, chainId, expiry)
    actions.push(...contractCallActions)

    return actions
  }, [])
}

// Create Action for Contract Call Permission
function createActionForContractCall(
  permission: ContractCallPermission,
  chainId: number,
  expiry: number
): ActionData[] {
  if (!permission.data.address) throw new Error(ERROR_MESSAGES.CONTRACT_ADDRESS_UNDEFINED)
  if (!permission.data.functions || permission.data.functions.length === 0)
    throw new Error(ERROR_MESSAGES.FUNCTIONS_UNDEFINED)

  return permission.data.functions.map(functionPermission => {
    const functionName = functionPermission.functionName
    const abi = permission.data.abi
    const functionAbi = getAbiItem({ abi, name: functionName })

    if (!functionAbi || functionAbi.type !== 'function') {
      throw new Error(ERROR_MESSAGES.FUNCTION_ABI_NOT_FOUND(functionName))
    }

    const functionSelector = toFunctionSelector(functionAbi)

    return {
      actionTarget: permission.data.address,
      actionTargetSelector: functionSelector,
      // Need atleast 1 actionPolicy, so hardcoding the TIME_FRAME_POLICY for now
      actionPolicies: [
        {
          policy: TIME_FRAME_POLICY_ADDRESSES[chainId],
          initData: encodePacked(['uint128', 'uint128'], [BigInt(expiry), BigInt(0)])
        }
      ]
    }
  })
}
