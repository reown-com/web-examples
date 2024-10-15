/**
 * Chains
 */
export const BITCOIN_MAINNET = {
  'bip122:000000000933ea01ad0ee984209779ba4ff763ae46a2a6c172b3f1b60a8ce26f': {
    chainId: '000000000933ea01ad0ee984209779ba4ff763ae46a2a6c172b3f1b60a8ce26f',
    name: 'BTC Mainnet',
    logo: '/chain-logos/btc-mainnet.png',
    rgb: '107, 111, 147',
    rpc: '',
    namespace: 'bip122'
  }
}
export const BITCOIN_TESTNET = {
  'bip122:000000000933ea01ad0ee984209779ba': {
    chainId: '000000000933ea01ad0ee984209779ba',
    name: 'BTC Testnet',
    logo: '/chain-logos/btc-testnet.png',
    rgb: '247, 147, 25',
    rpc: '',
    namespace: 'bip122'
  }
}

export const BIP122_CHAINS = { ...BITCOIN_TESTNET }

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
