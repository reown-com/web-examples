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

export async function getContext(
  walletClient: WalletClient,
  {
    account,
    grantPermissionsRequest
  }: { account: Account; grantPermissionsRequest: WalletGrantPermissionsRequest }
): Promise<`0x${string}`> {
  const { permissions, expiry, signer, chainId: hexChainId } = grantPermissionsRequest
  if (walletClient.chain === undefined) {
    throw new Error('GetSmartSessionContextParams:Chain is undefined')
  }
  if (toHex(walletClient.chain.id) !== hexChainId) {
    throw new Error('GetSmartSessionContextParams:Invalid/Mismatched chainId')
  }
  if (walletClient.account === undefined) {
    throw new Error('GetSmartSessionContextParams: wallet account is undefined')
  }
  const chainId = walletClient.chain.id
  const session: Session = getSmartSession(grantPermissionsRequest)

  const publicClient = createPublicClient({
    chain: walletClient.chain,
    transport: http()
  })
  const permissionId = (await getPermissionId({
    client: publicClient,
    session
  })) as Hex

  console.log('permissionId', permissionId)
  const sessionNonce = await getSessionNonce({
    client: publicClient,
    account,
    permissionId
  })

  const sessionDigest = await getSessionDigest({
    client: publicClient,
    account,
    session,
    mode: SmartSessionMode.ENABLE,
    permissionId
  })

  const chainDigests = [
    {
      chainId: BigInt(chainId),
      sessionDigest
    }
  ]

  const chainSessions: ChainSession[] = [
    {
      chainId: BigInt(chainId),
      session: {
        ...session,
        account: account.address,
        smartSession: SMART_SESSIONS_ADDRESS,
        mode: 1,
        nonce: sessionNonce
      }
    }
  ]
  const chainSessionHash = hashChainSessions(chainSessions)

  const encodedChainSessionHash = encode1271Hash({
    account,
    chainId: chainId,
    validator: account.address,
    hash: chainSessionHash
  })

  const encodedChainSessionSignature = await walletClient.signMessage({
    account: walletClient.account,
    message: { raw: toBytes(encodedChainSessionHash) }
  })
  const permissionEnableSignature = adjustVInSignature('eth_sign', encodedChainSessionSignature)

  const encodedSmartSessionSignature = encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: '0x',
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: chainDigests,
        sessionToEnable: session,
        permissionEnableSig: permissionEnableSignature
      },
      validator: account.address,
      accountType: 'safe'
    }
  })

  const smartSessionContext = encodePacked(
    ['address', 'bytes'],
    [SMART_SESSIONS_ADDRESS, encodedSmartSessionSignature]
  )
  return smartSessionContext
}

const adjustVInSignature = (
  signingMethod: 'eth_sign' | 'eth_signTypedData',
  signature: string
): Hex => {
  const ETHEREUM_V_VALUES = [0, 1, 27, 28]
  const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27
  let signatureV = Number.parseInt(signature.slice(-2), 16)
  if (!ETHEREUM_V_VALUES.includes(signatureV)) {
    throw new Error('Invalid signature')
  }
  if (signingMethod === 'eth_sign') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
    signatureV += 4
  }
  if (signingMethod === 'eth_signTypedData') {
    if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
      signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA
    }
  }
  return (signature.slice(0, -2) + signatureV.toString(16)) as Hex
}

function getSmartSession({
  chainId,
  expiry,
  permissions,
  policies,
  signer,
  address
}: WalletGrantPermissionsRequest): Session {
  const salt = toHex(toBytes('1', { size: 32 }))
  const chainIdNumber = parseInt(chainId, 16)
  const actions = getActionsFromPermissions(permissions, chainIdNumber, expiry)
  console.log('actions', actions)
  const sessionValidator = getSessionValidatorAddress(signer, chainIdNumber)
  console.log('sessionValidator', sessionValidator)
  const sessionValidatorInitData = getSessionValidatorInitData(signer)
  console.log('sessionValidatorInitData', sessionValidatorInitData)
  return {
    sessionValidator,
    sessionValidatorInitData: sessionValidatorInitData,
    salt: salt,
    userOpPolicies: [],
    actions: actions,
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: []
    }
  }
}

//---------------------------------------------------Signer Type guard---------------------------------------------------
// Type guard for MultiKeySigner
function isMultiKeySigner(signer: Signer): signer is MultiKeySigner {
  return signer.type === 'keys'
}

//---------------------------------------------------Process Signers---------------------------------------------------
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
    throw new Error(`Unsupported key type: ${key.type}`)
  })
}

//---------------------------------------------------Get Session Validator Address and Init Data---------------------------------------------------
function getSessionValidatorAddress(signer: Signer, chainId: number): `0x${string}` {
  if (isMultiKeySigner(signer)) {
    return MULTIKEY_SIGNER_ADDRESSES[chainId]
  }
  throw new Error('Unsupported signer type')
}

function getSessionValidatorInitData(signer: Signer): Hex {
  if (isMultiKeySigner(signer)) {
    const processedSigners = processMultiKeySigner(signer)
    return encodeMultiKeySignersInitData(processedSigners)
  }
  throw new Error(`Unsupported signer type: ${(signer as Signer).type}`)
}

function encodeMultiKeySignersInitData(signers: { type: SignerKeyType; data: string }[]): Hex {
  return signers.reduce(
    (encoded, signer) =>
      concat([encoded, encodePacked(['uint8', 'bytes'], [signer.type, signer.data as Hex])]),
    encodePacked(['uint8'], [signers.length]) as Hex
  )
}

//---------------------------------------------------Permission Type guard---------------------------------------------------
// Type guard for contract-call permissions
function isContractCallPermission(permission: Permission): permission is ContractCallPermission {
  return permission.type === 'contract-call'
}

//---------------------------------------------------Create Action for Permissions---------------------------------------------------
// Function to create actions from permissions
function getActionsFromPermissions(
  permissions: Permission[],
  chainId: number,
  expiry: number
): ActionData[] {
  return permissions.reduce((actions: ActionData[], permission) => {
    if (isContractCallPermission(permission)) {
      console.log('permissions is of type contract-call')
      const contractCallActions = createActionForContractCall(permission, chainId, expiry)
      actions.push(...contractCallActions)
    }
    console.log('permissions is not of type contract-call')
    // Add more permission type handlers here as needed
    return actions
  }, [])
}

// Function to create action for contract-call permission
function createActionForContractCall(
  permission: ContractCallPermission,
  chainId: number,
  expiry: number
): ActionData[] {
  if (permission.data.address === undefined) {
    throw new Error('Contract address is undefined')
  }
  if (permission.data.functions === undefined || permission.data.functions.length === 0) {
    throw new Error('Functions is undefined')
  }

  return permission.data.functions.map(functionPermission => {
    const functionName = functionPermission.functionName
    const abi = permission.data.abi
    const functionAbi = getAbiItem({
      abi,
      name: functionName
    })
    if (functionAbi === undefined || functionAbi.type !== 'function') {
      throw new Error(`Function ABI not found for function: ${functionName}`)
    }
    const functionSelector = toFunctionSelector(functionAbi)

    return {
      actionTarget: permission.data.address,
      actionTargetSelector: functionSelector,
      actionPolicies: [
        {
          policy: TIME_FRAME_POLICY_ADDRESSES[chainId],
          initData: encodePacked(['uint128', 'uint128'], [BigInt(expiry), BigInt(0)]) // hardcoded for demo
        }
      ]
    }
  })
}
