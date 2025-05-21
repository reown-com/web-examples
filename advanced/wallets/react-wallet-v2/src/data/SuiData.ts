/**
 * Chains
 */
export const SUI_NAMESPACE = 'sui'

export const SUI_MAINNET_ID = 'mainnet'
export const SUI_TESTNET_ID = 'testnet'
export const SUI_DEVNET_ID = 'devnet'
export const SUI_MAINNET_CAIP2 = `${SUI_NAMESPACE}:${SUI_MAINNET_ID}`
export const SUI_TESTNET_CAIP2 = `${SUI_NAMESPACE}:${SUI_TESTNET_ID}`
export const SUI_DEVNET_CAIP2 = `${SUI_NAMESPACE}:${SUI_DEVNET_ID}`

export type ISuiChainId =
  | typeof SUI_MAINNET_CAIP2
  | typeof SUI_TESTNET_CAIP2
  | typeof SUI_DEVNET_CAIP2

export const SUI_MAINNET = {
  [SUI_MAINNET_CAIP2]: {
    chainId: SUI_MAINNET_ID,
    name: 'SUI Mainnet',
    logo: '/chain-logos/sui.png',
    rgb: '6, 135, 245',
    rpc: '',
    caip2: SUI_MAINNET_CAIP2 as ISuiChainId,
    namespace: SUI_NAMESPACE
  }
}
export const SUI_TESTNET = {
  [SUI_TESTNET_CAIP2]: {
    chainId: SUI_TESTNET_ID,
    name: 'SUI Testnet',
    logo: '/chain-logos/sui.png',
    rgb: '6, 135, 245',
    rpc: '',
    caip2: SUI_TESTNET_CAIP2 as ISuiChainId,
    namespace: SUI_NAMESPACE
  }
}
export const SUI_DEVNET = {
  [SUI_DEVNET_CAIP2]: {
    chainId: SUI_DEVNET_ID,
    name: 'SUI Devnet',
    logo: '/chain-logos/sui.png',
    rgb: '6, 135, 245',
    rpc: '',
    caip2: SUI_DEVNET_CAIP2 as ISuiChainId,
    namespace: SUI_NAMESPACE
  }
}

export const SUI_CHAINS = { ...SUI_MAINNET, ...SUI_TESTNET, ...SUI_DEVNET } as Record<
  ISuiChainId,
  typeof SUI_MAINNET[typeof SUI_MAINNET_CAIP2] &
    typeof SUI_TESTNET[typeof SUI_TESTNET_CAIP2] &
    typeof SUI_DEVNET[typeof SUI_DEVNET_CAIP2]
>
export const SUI_TESTNET_CHAINS = { ...SUI_TESTNET, ...SUI_DEVNET } as Record<
  ISuiChainId,
  typeof SUI_TESTNET[typeof SUI_TESTNET_CAIP2] & typeof SUI_DEVNET[typeof SUI_DEVNET_CAIP2]
>

export const SUI_MAINNET_CHAINS = { ...SUI_MAINNET } as Record<
  ISuiChainId,
  typeof SUI_MAINNET[typeof SUI_MAINNET_CAIP2]
>

/**
 * Methods
 */
export const SUI_SIGNING_METHODS = {
  SUI_SIGN_TRANSACTION: 'sui_signTransaction',
  SUI_SIGN_AND_EXECUTE_TRANSACTION: 'sui_signAndExecuteTransaction',
  SUI_SIGN_PERSONAL_MESSAGE: 'sui_signPersonalMessage'
}

/**
 * Events
 */

export const SUI_EVENTS = {
  SUI_ACCOUNTS_CHANGED: 'sui_accountsChanged',
  SUI_CHAIN_CHANGED: 'sui_chainChanged'
}
