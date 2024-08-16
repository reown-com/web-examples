import toast from 'react-hot-toast'
import { COSMOS_MAINNET_CHAINS, TCosmosChain } from '@/data/COSMOSData'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { MULTIVERSX_CHAINS, TMultiversxChain } from '@/data/MultiversxData'
import { NEAR_CHAINS, NEAR_TEST_CHAINS, TNearChain } from '@/data/NEARData'
import { POLKADOT_CHAINS, TPolkadotChain } from '@/data/PolkadotData'
import { SOLANA_CHAINS, TSolanaChain } from '@/data/SolanaData'
import { TEZOS_CHAINS, TTezosChain } from '@/data/TezosData'
import { TRON_CHAINS, TTronChain } from '@/data/TronData'
import { KADENA_CHAINS, TKadenaChain } from '@/data/KadenaData'

import { utils } from 'ethers'
import { Verify } from '@walletconnect/types'
import bs58 from 'bs58'

/**
 * Truncates string (in the middle) via given lenght value
 */
export function truncate(value: string, length: number) {
  if (value?.length <= length) {
    return value
  }

  const separator = '...'
  const stringLength = length - separator.length
  const frontLength = Math.ceil(stringLength / 2)
  const backLength = Math.floor(stringLength / 2)

  return value.substring(0, frontLength) + separator + value.substring(value.length - backLength)
}

/**
 * Converts hex to utf8 string if it is valid bytes
 */
export function convertHexToUtf8(value: string) {
  if (utils.isHexString(value)) {
    return utils.toUtf8String(value)
  }

  return value
}

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export function getSignParamsMessage(params: string[]) {
  const message = params.filter(p => !utils.isAddress(p))[0]

  return convertHexToUtf8(message)
}

/**
 * Gets data from various signTypedData request methods by filtering out
 * a value that is not an address (thus is data).
 * If data is a string convert it to object
 */
export function getSignTypedDataParamsData(params: string[]) {
  const data = params.filter(p => !utils.isAddress(p))[0]

  if (typeof data === 'string') {
    return JSON.parse(data)
  }

  return data
}

/**
 * Get our address from params checking if params string contains one
 * of our wallet addresses
 */
export function getWalletAddressFromParams(addresses: string[], params: any) {
  const paramsString = JSON.stringify(params)
  let address = ''

  addresses.forEach(addr => {
    if (paramsString.toLowerCase().includes(addr.toLowerCase())) {
      address = addr
    }
  })

  return address
}

/**
 * Check if chain is part of EIP155 standard
 */
export function isEIP155Chain(chain: string) {
  return chain.includes('eip155')
}

/**
 * Check if chain is part of COSMOS standard
 */
export function isCosmosChain(chain: string) {
  return chain.includes('cosmos')
}

/**
 * Check if chain is part of SOLANA standard
 */
export function isSolanaChain(chain: string) {
  return chain.includes('solana')
}

/**
 * Check if chain is part of POLKADOT standard
 */
export function isPolkadotChain(chain: string) {
  return chain.includes('polkadot')
}

/**
 * Check if chain is part of NEAR standard
 */
export function isNearChain(chain: string) {
  return chain.includes('near')
}

/**
 * Check if chain is part of KADENA standard
 */
export function isKadenaChain(chain: string) {
  return chain.includes('kadena')
}

/**
 * Check if chain is part of MULTIVERSX standard
 */
export function isMultiversxChain(chain: string) {
  return chain.includes('mvx')
}

/**
 * Check if chain is part of TRON standard
 */
export function isTronChain(chain: string) {
  return chain.includes('tron')
}

/**
 * Check if chain is part of Tezos standard
 */
export function isTezosChain(chain: string) {
  return chain.includes('tezos')
}

/**
 * Formats chainId to its name
 */
export function formatChainName(chainId: string) {
  return (
    COSMOS_MAINNET_CHAINS[chainId as TCosmosChain]?.name ??
    EIP155_CHAINS[chainId as TEIP155Chain]?.name ??
    MULTIVERSX_CHAINS[chainId as TMultiversxChain]?.name ??
    NEAR_TEST_CHAINS[chainId as TNearChain]?.name ??
    POLKADOT_CHAINS[chainId as TPolkadotChain]?.name ??
    SOLANA_CHAINS[chainId as TSolanaChain]?.name ??
    TRON_CHAINS[chainId as TTronChain]?.name ??
    TEZOS_CHAINS[chainId as TTezosChain]?.name ??
    KADENA_CHAINS[chainId as TKadenaChain]?.name ??
    chainId
  )
}

export function styledToast(message: string, type: string) {
  if (type === 'success') {
    toast.success(message, {
      position: 'bottom-left',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff'
      }
    })
  } else if (type === 'error') {
    toast.error(message, {
      position: 'bottom-left',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff'
      }
    })
  }
}

export const decodeDIDToSecp256k1PublicKey = (did: string): string => {
  // Check if the DID starts with the correct prefix
  if (!did.startsWith('did:key:zQ3s')) {
    throw new Error('Invalid DID format. Must start with "did:key:zQ3s"')
  }

  // Extract the Base58 encoded part
  const encodedPart = did.slice('did:key:zQ3s'.length)

  // Decode the Base58 string
  const decodedBuffer = bs58.decode(encodedPart)

  // Convert the Buffer to a hex string
  const publicKey = Buffer.from(decodedBuffer).toString('hex')

  // Add the '0x' prefix
  return '0x' + publicKey
}

export enum KEY_TYPES {
  secp256k1 = 'secp256k1',
  secp256r1 = 'secp256r1',
  ed25519 = 'ed25519',
  x25519 = 'x25519',
  rsa = 'rsa',
  'p-384' = 'p-384',
  'p-521' = 'p-521'
}

export const decodeDIDToPublicKey = (
  did: string
): {
  key: `0x${string}`
  keyType: KEY_TYPES
} => {
  // Define the DID prefix to key type mapping
  const didPrefixToKeyType: Record<string, KEY_TYPES> = {
    'did:key:zQ3s': KEY_TYPES.secp256k1,
    'did:key:zDn': KEY_TYPES.secp256r1,
    'did:key:z6Mk': KEY_TYPES.ed25519,
    'did:key:z6LS': KEY_TYPES.x25519,
    'did:key:z4MX': KEY_TYPES.rsa,
    'did:key:z82L': KEY_TYPES['p-384'],
    'did:key:z2J9': KEY_TYPES['p-521']
  }

  // Find the matching key type prefix
  const matchingPrefix = Object.keys(didPrefixToKeyType).find(prefix => did.startsWith(prefix))

  if (!matchingPrefix) {
    throw new Error('Invalid DID format. Unsupported key type.')
  }

  // Extract the Base58 encoded part
  const encodedPart = did.slice(matchingPrefix.length)

  // Decode the Base58 string
  const decodedBuffer = bs58.decode(encodedPart)

  // Convert the Buffer to a hex string
  const publicKey = Buffer.from(decodedBuffer).toString('hex')

  // Add the '0x' prefix
  const formattedPublicKey = `0x${publicKey}` as `0x${string}`

  // Get the key type
  const keyType = didPrefixToKeyType[matchingPrefix]

  return {
    key: formattedPublicKey,
    keyType
  }
}

export function bigIntReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  return value
}
