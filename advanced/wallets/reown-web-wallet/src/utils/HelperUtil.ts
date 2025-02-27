import toast from 'react-hot-toast'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'

import { isAddress, isHexString, toUtf8String } from 'ethers'

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
  if (isHexString(value)) {
    return toUtf8String(value)
  }

  return value
}

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export function getSignParamsMessage(params: string[]) {
  const message = params.filter(p => !isAddress(p))[0]

  return convertHexToUtf8(message)
}

/**
 * Gets data from various signTypedData request methods by filtering out
 * a value that is not an address (thus is data).
 * If data is a string convert it to object
 */
export function getSignTypedDataParamsData(params: string[]) {
  const data = params.filter(p => !isAddress(p))[0]

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
    EIP155_CHAINS[chainId as TEIP155Chain]?.name ??
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
