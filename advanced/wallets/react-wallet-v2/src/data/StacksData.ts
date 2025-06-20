/**
 * Chains
 */
export const STACKS_NAMESPACE = 'stacks'

export const STACKS_MAINNET_ID = '1'
export const STACKS_TESTNET_ID = '2147483648'
export const STACKS_MAINNET_CAIP2 = `${STACKS_NAMESPACE}:${STACKS_MAINNET_ID}`
export const STACKS_TESTNET_CAIP2 = `${STACKS_NAMESPACE}:${STACKS_TESTNET_ID}`

export type IStacksChainId = typeof STACKS_MAINNET_CAIP2 | typeof STACKS_TESTNET_CAIP2

export const STACKS_MAINNET = {
  [STACKS_MAINNET_CAIP2]: {
    chainId: STACKS_MAINNET_ID,
    name: 'Stacks Mainnet',
    logo: '/chain-logos/stacks.png',
    rgb: '107, 111, 147',
    rpc: '',
    coinType: '0',
    caip2: STACKS_MAINNET_CAIP2 as IStacksChainId,
    namespace: STACKS_NAMESPACE
  }
}
export const STACKS_TESTNET = {
  [STACKS_TESTNET_CAIP2]: {
    chainId: STACKS_TESTNET_ID,
    name: 'Stacks Testnet',
    logo: '/chain-logos/stacks.png',
    rgb: '107, 111, 147',
    rpc: '',
    coinType: '1',
    caip2: STACKS_TESTNET_CAIP2 as IStacksChainId,
    namespace: STACKS_NAMESPACE
  }
}

export const STACKS_CHAINS = { ...STACKS_MAINNET, ...STACKS_TESTNET } as Record<
  IStacksChainId,
  typeof STACKS_MAINNET[typeof STACKS_MAINNET_CAIP2] &
    typeof STACKS_TESTNET[typeof STACKS_TESTNET_CAIP2]
>

/**
 * Methods
 */
export const STACKS_SIGNING_METHODS = {
  STACKS_SEND_TRANSFER: 'stx_transferStx',
  STACKS_SIGN_MESSAGE: 'stx_signMessage'
}

/**
 * Events
 */

export const STACKS_EVENTS = {
  STACKS_CHAIN_CHANGED: 'stx_chainChanged',
  STACKS_ACCOUNTS_CHANGED: 'stx_accountsChanged'
}
