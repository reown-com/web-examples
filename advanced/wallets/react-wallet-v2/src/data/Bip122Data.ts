/**
 * Chains
 */
export const BIP122_NAMESPACE = 'bip122'

export const BIP122_MAINNET_ID = '000000000019d6689c085ae165831e93'
export const BIP122_TESTNET_ID = '000000000933ea01ad0ee984209779ba'
export const BIP122_MAINNET_CAIP2 = `${BIP122_NAMESPACE}:${BIP122_MAINNET_ID}`
export const BIP122_TESTNET_CAIP2 = `${BIP122_NAMESPACE}:${BIP122_TESTNET_ID}`

export type IBip122ChainId = typeof BIP122_MAINNET_CAIP2 | typeof BIP122_TESTNET_CAIP2

export const BITCOIN_MAINNET = {
  [BIP122_MAINNET_CAIP2]: {
    chainId: BIP122_MAINNET_ID,
    name: 'BTC Mainnet',
    logo: '/chain-logos/btc-testnet.png',
    rgb: '107, 111, 147',
    rpc: '',
    coinType: '0',
    caip2: BIP122_MAINNET_CAIP2 as IBip122ChainId,
    namespace: BIP122_NAMESPACE
  }
}
export const BITCOIN_TESTNET = {
  [BIP122_TESTNET_CAIP2]: {
    chainId: BIP122_TESTNET_ID,
    name: 'BTC Testnet',
    logo: '/chain-logos/btc-testnet.png',
    rgb: '247, 147, 25',
    rpc: '',
    coinType: '1',
    caip2: BIP122_TESTNET_CAIP2 as IBip122ChainId,
    namespace: BIP122_NAMESPACE
  }
}

export const BIP122_CHAINS = { ...BITCOIN_MAINNET, ...BITCOIN_TESTNET } as Record<
  IBip122ChainId,
  typeof BITCOIN_MAINNET[typeof BIP122_MAINNET_CAIP2] &
    typeof BITCOIN_TESTNET[typeof BIP122_TESTNET_CAIP2]
>

/**
 * Methods
 */
export const BIP122_SIGNING_METHODS = {
  BIP122_SIGN_MESSAGE: 'signMessage',
  BIP122_GET_ACCOUNT_ADDRESSES: 'getAccountAddresses',
  BIP122_SEND_TRANSACTION: 'sendTransfer',
  BIP122_SIGN_PSBT: 'signPsbt'
}

/**
 * Events
 */

export const BIP122_EVENTS = {
  BIP122_ADDRESSES_CHANGED: 'bip122_addressesChanged'
}
