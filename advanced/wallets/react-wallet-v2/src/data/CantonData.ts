type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  rpc: string
  namespace: string
  symbol: string
}

export type TCantonChain = keyof typeof CANTON_MAINNET_CHAINS

export const CANTON_MAINNET_CHAINS: Record<string, ChainMetadata> = {
  'canton:mainnet': {
    chainId: 'mainnet',
    name: 'Canton Network',
    logo: '/chain-logos/canton-mainnet.png',
    rgb: '0, 122, 255',
    rpc: '',
    namespace: 'canton',
    symbol: 'CANTON'
  }
}

export const CANTON_TEST_CHAINS: Record<string, ChainMetadata> = {
  'canton:devnet': {
    chainId: 'devnet',
    name: 'Canton Devnet',
    logo: '/chain-logos/canton-mainnet.png',
    rgb: '0, 122, 255',
    rpc: '',
    namespace: 'canton',
    symbol: 'CANTON'
  }
}

export const CANTON_CHAINS = { ...CANTON_MAINNET_CHAINS, ...CANTON_TEST_CHAINS }

export const CANTON_SIGNING_METHODS = {
  CANTON_PREPARE_SIGN_EXECUTE: 'canton_prepareSignExecute',
  CANTON_LIST_ACCOUNTS: 'canton_listAccounts',
  CANTON_GET_PRIMARY_ACCOUNT: 'canton_getPrimaryAccount',
  CANTON_GET_ACTIVE_NETWORK: 'canton_getActiveNetwork',
  CANTON_STATUS: 'canton_status',
  CANTON_LEDGER_API: 'canton_ledgerApi',
  CANTON_SIGN_MESSAGE: 'canton_signMessage'
}

export const CANTON_EVENTS = {
  CANTON_ACCOUNTS_CHANGED: 'accountsChanged',
  CANTON_STATUS_CHANGED: 'statusChanged'
}
