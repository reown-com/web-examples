import {
  MOCK_VALIDATOR_ADDRESSES,
  MULTIKEY_SIGNER_ADDRESSES,
  TIME_FRAME_POLICY_ADDRESSES
} from './SmartSessionUtil'
import type { Session, ChainSession, Account, ActionData } from '@rhinestone/module-sdk'
const {
  SMART_SESSIONS_ADDRESS,
  SmartSessionMode,
  getPermissionId,
  getSessionDigest,
  getSessionNonce,
  encodeSmartSessionSignature,
  hashChainSessions
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
import {
  concat,
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  Hex,
  http,
  parseAbiParameters,
  toBytes,
  toHex,
  WalletClient
} from 'viem'
import { publicKeyToAddress } from 'viem/accounts'
import { parsePublicKey } from 'webauthn-p256'
import {
  MultiKeySigner,
  Permission,
  Signer,
  WalletGrantPermissionsRequest,
  ContractCallPermission,
  WalletSigner,
  KeySigner,
  AccountSigner,
  SignerKeyType,
  NativeTokenTransferPermission,
  ERC20TokenTransferPermission,
  ERC721TokenTransferPermission,
  GasLimitPermission,
  ERC1155TokenTransferPermission,
  CallLimitPermission,
  RateLimitPermission
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
  const permissionEnableHash = hashChainSessions(chainSessions)

  // const formattedHash = encode1271Hash({
  //   account,
  //   chainId: chainId,
  //   validator: account.address,
  //   hash: permissionEnableHash
  // })

  const permissionEnableSig = await walletClient.signMessage({
    account: walletClient.account,
    // message: { raw: formattedHash }
    message: { raw: permissionEnableHash }
  })

  const encodedSmartSessionSignature = encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: '0x',
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: chainDigests,
        sessionToEnable: session,
        permissionEnableSig
      },
      validator: MOCK_VALIDATOR_ADDRESSES[chainId], //account.address,
      accountType: 'safe'
    }
  })

  const smartSessionContext = encodePacked(
    ['address', 'bytes'],
    [SMART_SESSIONS_ADDRESS, encodedSmartSessionSignature]
  )
  return smartSessionContext
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

// Type guard for WalletSigner
function isWalletSigner(signer: Signer): signer is WalletSigner {
  return signer.type === 'wallet'
}

// Type guard for KeySigner
function isKeySigner(signer: Signer): signer is KeySigner {
  return signer.type === 'key'
}

// Type guard for AccountSigner
function isAccountSigner(signer: Signer): signer is AccountSigner {
  return signer.type === 'account'
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

// Type guard for NativeTokenTransferPermission
function isNativeTokenTransferPermission(
  permission: Permission
): permission is NativeTokenTransferPermission {
  return permission.type === 'native-token-transfer'
}

// Type guard for ERC20TokenTransferPermission
function isERC20TokenTransferPermission(
  permission: Permission
): permission is ERC20TokenTransferPermission {
  return permission.type === 'erc20-token-transfer'
}

// Type guard for ERC721TokenTransferPermission
function isERC721TokenTransferPermission(
  permission: Permission
): permission is ERC721TokenTransferPermission {
  return permission.type === 'erc721-token-transfer'
}

// Type guard for ERC1155TokenTransferPermission
function isERC1155TokenTransferPermission(
  permission: Permission
): permission is ERC1155TokenTransferPermission {
  return permission.type === 'erc1155-token-transfer'
}

// Type guard for GasLimitPermission
function isGasLimitPermission(permission: Permission): permission is GasLimitPermission {
  return permission.type === 'gas-limit'
}

// Type guard for CallLimitPermission
function isCallLimitPermission(permission: Permission): permission is CallLimitPermission {
  return permission.type === 'call-limit'
}

// Type guard for RateLimitPermission
function isRateLimitPermission(permission: Permission): permission is RateLimitPermission {
  return permission.type === 'rate-limit'
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
      actions.push(createActionForContractCall(permission, chainId, expiry))
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
): ActionData {
  if (permission.data.address === undefined) {
    throw new Error('Contract address is undefined')
  }
  if (permission.data.functionSelector === undefined) {
    throw new Error('Function selector is undefined')
  }
  return {
    actionTarget: permission.data.address,
    actionTargetSelector: permission.data.functionSelector,
    actionPolicies: [
      {
        policy: TIME_FRAME_POLICY_ADDRESSES[chainId],
        initData: encodePacked(['uint128', 'uint128'], [BigInt(expiry), BigInt(0)]) // hardcoded for demo
      }
    ]
  }
}
