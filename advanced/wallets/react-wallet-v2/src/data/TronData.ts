/**
 * Types
 */
export type TTronChain = keyof typeof TRON_CHAINS

interface TRONChains {
  [key: string]: ChainMetadata
}

type ChainMetadata = {
  chainId: string
  name: string
  logo: string
  rgb: string
  fullNode: string
  namespace: string
  symbol: string
}

/**
 * TRON Chain Identifiers & Metadata (CAIP-2 Specification)
 *
 * Background & Specification:
 * In accordance with the ChainAgnostic Standards Alliance (CASA) CAIP-2 specification
 * for the TRON namespace and TRON ecosystem conventions, the primary chain ID
 * reference uses decimal representation:
 *
 *   Network   Chain ID (Decimal)   Genesis Hash (last 4 bytes)   Hexadecimal (Legacy)
 *   ----------------------------------------------------------------------------------
 *   Mainnet   728126428            ...2b6653dc                   0x2b6653dc
 *   Nile      3448148188           ...cd8690dc                   0xcd8690dc
 *   Shasta    2494104990           ...94a9059e                   0x94a9059e
 *
 * Rationale:
 * - Uses decimal chain IDs matching ethereum-lists/chains.
 * - eth_chainId returns the same numeric values in hexadecimal.
 *
 * Backwards Compatibility Strategy:
 * - Primary Chains: TRON_MAINNET_CHAINS and TRON_TEST_CHAINS use decimal format by default.
 * - Legacy Chains: TRON_COMPATIBILITY_CHAINS defines legacy hex identifiers and is
 *   merged into TRON_CHAINS. Legacy sessions preserve their original hex chain IDs,
 *   and payment requests advertise both formats to ensure uninterrupted support
 *   for existing dApps and integrations.
 *
 * Reference: https://github.com/ChainAgnostic/namespaces
 */
export const TRON_MAINNET_CHAINS: TRONChains = {
  'tron:728126428': {
    chainId: '728126428',
    name: 'TRON',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://api.trongrid.io',
    namespace: 'tron',
    symbol: 'TRX'
  }
}

export const TRON_TEST_CHAINS: TRONChains = {
  'tron:3448148188': {
    chainId: '3448148188',
    name: 'TRON Testnet',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://nile.trongrid.io/',
    namespace: 'tron',
    symbol: 'TRX'
  },
  'tron:2494104990': {
    chainId: '2494104990',
    name: 'TRON Shasta Testnet',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://api.shasta.trongrid.io',
    namespace: 'tron',
    symbol: 'TRX'
  }
}

/**
 * Backward compatibility chains (Hexadecimal equivalent)
 *
 * Preserves legacy hex identifiers (`tron:0x...`) so existing dApps can continue
 * establishing sessions and routing requests without interruption.
 * Reference: https://github.com/ChainAgnostic/namespaces
 */
export const TRON_COMPATIBILITY_CHAINS: TRONChains = {
  'tron:0x2b6653dc': {
    chainId: '0x2b6653dc',
    name: 'TRON',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://api.trongrid.io',
    namespace: 'tron',
    symbol: 'TRX'
  },
  'tron:0xcd8690dc': {
    chainId: '0xcd8690dc',
    name: 'TRON Testnet',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://nile.trongrid.io/',
    namespace: 'tron',
    symbol: 'TRX'
  },
  'tron:0x94a9059e': {
    chainId: '0x94a9059e',
    name: 'TRON Shasta Testnet',
    logo: 'chain-logos/tron.png',
    rgb: '183, 62, 49',
    fullNode: 'https://api.shasta.trongrid.io',
    namespace: 'tron',
    symbol: 'TRX'
  }
}

export const TRON_CHAINS = {
  ...TRON_MAINNET_CHAINS,
  ...TRON_TEST_CHAINS,
  ...TRON_COMPATIBILITY_CHAINS
}

/**
 * WalletConnect Pay
 */

/**
 * On Tron the buyer pays their own energy — there is no fee payer and no fee bump —
 * so WalletConnect Pay does not offer a Tron option to an account below this balance.
 */
export const TRON_MIN_TRX_FOR_ENERGY = 14

/**
 * Methods
 */
export const TRON_SIGNING_METHODS = {
  TRON_SIGN_TRANSACTION: 'tron_signTransaction',
  TRON_SIGN_MESSAGE: 'tron_signMessage',
  TRON_SEND_TRANSACTION: 'tron_sendTransaction'
}
