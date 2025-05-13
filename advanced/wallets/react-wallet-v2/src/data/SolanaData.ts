/**
 * Types
 */
export type TSolanaChain = keyof typeof SOLANA_MAINNET_CHAINS

/**
 * Chains
 */
export const SOLANA_MAINNET_CHAINS = {
  // This chainId is deprecated and should not be used. Preserved for backwards compatibility.
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': {
    chainId: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
    name: 'Solana (Legacy)',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: '',
    namespace: 'solana'
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.mainnet-beta.solana.com',
    namespace: 'solana'
  },
  'solana:EAQLJCV2mh23BsK2P9oYpV5CHVLDNHTx': {
    chainId: 'EAQLJCV2mh23BsK2P9oYpV5CHVLDNHTx',
    name: 'Eclipse',
    logo: '/chain-logos/eclipse.png',
    rgb: '162, 254, 160',
    rpc: 'https://eclipse.helius-rpc.com',
    namespace: 'solana'
  },
  'solana:CX4huckiV9QNAkKNVKi5Tj8nxzBive5k': {
    chainId: 'CX4huckiV9QNAkKNVKi5Tj8nxzBive5k',
    name: 'Eclipse Testnet',
    logo: '/chain-logos/eclipse.png',
    rgb: '162, 254, 160',
    rpc: 'https://testnet.dev2.eclipsenetwork.xyz',
    namespace: 'solana'
  },
  'solana:8axJLKAqQU9oyULRunGrZTLDEXhn17VW': {
    chainId: '8axJLKAqQU9oyULRunGrZTLDEXhn17VW',
    name: 'Eclipse Devnet',
    logo: '/chain-logos/eclipse.png',
    rgb: '162, 254, 160',
    rpc: 'https://staging-rpc.dev2.eclipsenetwork.xyz',
    namespace: 'solana'
  }
}

export const SOLANA_TEST_CHAINS = {
  // This chainId is deprecated and should not be used. Preserved for backwards compatibility.
  'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K': {
    chainId: '8E9rvCKLFQia2Y35HXjjpWzj8weVo44K',
    name: 'Solana Devnet (Legacy)',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: '',
    namespace: 'solana'
  },
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
    chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    name: 'Solana Devnet',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.devnet.solana.com',
    namespace: 'solana'
  },
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': {
    chainId: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
    name: 'Solana Testnet',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.testnet.solana.com',
    namespace: 'solana'
  }
}

export const SOLANA_CHAINS = { ...SOLANA_MAINNET_CHAINS, ...SOLANA_TEST_CHAINS }

/**
 * Methods
 */
export const SOLANA_SIGNING_METHODS = {
  SOLANA_SIGN_TRANSACTION: 'solana_signTransaction',
  SOLANA_SIGN_MESSAGE: 'solana_signMessage',
  SOLANA_SIGN_AND_SEND_TRANSACTION: 'solana_signAndSendTransaction',
  SOLANA_SIGN_ALL_TRANSACTIONS: 'solana_signAllTransactions',
  SOLANA_WALLET_CHECKOUT: 'wallet_checkout'
}
