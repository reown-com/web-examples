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
  type WalletClient,
  concat,
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  getAbiItem,
  http,
  parseAbiParameters,
  toBytes,
  toFunctionSelector,
  toHex
} from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { parsePublicKey } from 'webauthn-p256'
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
  CHAIN_UNDEFINED: 'getContext: Chain is undefined',
  INVALID_CHAIN_ID: 'getContext: Invalid/Mismatched chainId',
  ACCOUNT_UNDEFINED: 'getContext: Wallet account is undefined',
  CONTRACT_ADDRESS_UNDEFINED: 'Contract address is undefined',
  FUNCTIONS_UNDEFINED: 'Functions is undefined',
  FUNCTION_ABI_NOT_FOUND: (functionName: string) =>
    `Function ABI not found for function: ${functionName}`,
  UNSUPPORTED_KEY_TYPE: (keyType: string) => `Unsupported key type: ${keyType}`,
  UNSUPPORTED_SIGNER_TYPE: 'Unsupported signer type',
  INVALID_SIGNATURE: 'Invalid signature',
  UNSUPPORTED_PERMISSION_TYPE: (permissionType: string) =>
    `Unsupported permission type: ${permissionType}. Only 'contract-call' is allowed.`
}

// Validate inputs for getContext
async function validateInputs(walletClient: WalletClient, hexChainId: `0x${string}`) {
  if (!walletClient.chain) throw new Error(ERROR_MESSAGES.CHAIN_UNDEFINED)
  if (toHex(walletClient.chain.id) !== hexChainId) throw new Error(ERROR_MESSAGES.INVALID_CHAIN_ID)
  if (!walletClient.account) throw new Error(ERROR_MESSAGES.ACCOUNT_UNDEFINED)
}

// Parse hex chain ID to number
function parseChainId(hexChainId: `0x${string}`): number {
  return parseInt(hexChainId, 16)
}

// Build a ChainSession from given parameters
function buildChainSession(
  chainId: number,
  session: Session,
  accountAddress: `0x${string}`,
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
  walletClient: WalletClient,
  account: Account,
  session: Session
): Promise<{ sessionNonce: bigint; sessionDigest: `0x${string}`; permissionId: Hex }> {
  const publicClient = createPublicClient({
    chain: walletClient.chain,
    transport: http()
  })

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

// Get context for the smart session
export async function getContext(
  walletClient: WalletClient,
  {
    account,
    grantPermissionsRequest
  }: { account: Account; grantPermissionsRequest: WalletGrantPermissionsRequest }
): Promise<`0x${string}`> {
  const { permissions, expiry, signer, chainId: hexChainId } = grantPermissionsRequest

  // Validate inputs
  await validateInputs(walletClient, hexChainId)

  // Parse chain ID and retrieve session
  const chainId = parseChainId(hexChainId)
  const session: Session = getSmartSession(grantPermissionsRequest)

  // Fetch session data
  const { sessionNonce, sessionDigest, permissionId } = await fetchSessionData(
    walletClient,
    account,
    session
  )

  // Build chain session and hash it
  const chainSession = buildChainSession(chainId, session, account.address, sessionNonce)
  const chainSessionHash = hashChainSessions([chainSession])

  // Encode chain session hash
  const encodedChainSessionHash = encode1271Hash({
    account,
    chainId,
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
        hashesAndChainIds: [{ chainId: BigInt(chainId), sessionDigest }],
        sessionToEnable: session,
        permissionEnableSig: permissionEnableSignature
      },
      validator: account.address,
      accountType: account.type
    }
  })

  // Return the encoded packed data
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

// Get the Smart Session based on the request parameters
function getSmartSession({
  chainId,
  expiry,
  permissions,
  signer
}: WalletGrantPermissionsRequest): Session {
  const salt = toHex(toBytes('1', { size: 32 }))
  const chainIdNumber = parseInt(chainId, 16)
  const actions = getActionsFromPermissions(permissions, chainIdNumber, expiry)

  const sessionValidator = getSessionValidatorAddress(signer, chainIdNumber)
  const sessionValidatorInitData = getSessionValidatorInitData(signer)

  return {
    sessionValidator,
    sessionValidatorInitData,
    salt,
    userOpPolicies: [],
    actions,
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: []
    }
  }
}

// Type Guards for Signers
function isMultiKeySigner(signer: Signer): signer is MultiKeySigner {
  return signer.type === 'keys'
}

// Process MultiKey Signer
function processMultiKeySigner(signer: MultiKeySigner): { type: SignerKeyType; data: string }[] {
  return signer.data.keys.map(key => {
    if (key.type === 'secp256k1') {
      const eoaAddress = publicKeyToAddress(key.publicKey)
      return { type: SignerKeyType.SECP256K1, data: eoaAddress }
    } else if (key.type === 'secp256r1') {
      const passkeyPublicKey = parsePublicKey(key.publicKey as `0x${string}`)
      const encodedData = encodeAbiParameters(parseAbiParameters('uint256, uint256'), [
        passkeyPublicKey.x,
        passkeyPublicKey.y
      ])
      return { type: SignerKeyType.SECP256R1, data: encodedData }
    }
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_KEY_TYPE(key.type))
  })
}

// Get the Session Validator Address and Init Data
function getSessionValidatorAddress(signer: Signer, chainId: number): `0x${string}` {
  if (isMultiKeySigner(signer)) {
    return MULTIKEY_SIGNER_ADDRESSES[chainId]
  }
  throw new Error(ERROR_MESSAGES.UNSUPPORTED_SIGNER_TYPE)
}

// Get the Session Validator Init Data
function getSessionValidatorInitData(signer: Signer): Hex {
  if (isMultiKeySigner(signer)) {
    const processedSigners = processMultiKeySigner(signer)
    return encodeMultiKeySignersInitData(processedSigners)
  }
  throw new Error(ERROR_MESSAGES.UNSUPPORTED_SIGNER_TYPE)
}

// Encode MultiKey Signers Init Data
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

// Create Actions from Permissions
function getActionsFromPermissions(
  permissions: Permission[],
  chainId: number,
  expiry: number
): ActionData[] {
  return permissions.reduce((actions: ActionData[], permission) => {
    if (!isContractCallPermission(permission)) {
      throw new Error(ERROR_MESSAGES.UNSUPPORTED_PERMISSION_TYPE((permission as Permission).type))
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
          initData: encodePacked(['uint128', 'uint128'], [BigInt(expiry), BigInt(0)]) // hardcoded for demo
        }
      ]
    }
  })
}
