/**
 * Types
 */
export type TTonChain = keyof typeof TON_MAINNET_CHAINS | keyof typeof TON_TEST_CHAINS

export const blockchainApiRpc = (chainId: string) => {
  return `https://rpc.walletconnect.org/v1?chainId=ton:${chainId}&projectId=${process.env.NEXT_PUBLIC_PROJECT_ID}`
}

export const tonCenterRpc = (testnet: boolean) => {
  return testnet
    ? 'https://ton-testnet.api.onfinality.io/public'
    : 'https://toncenter.com/api/v2/jsonRPC'
}

/**
 * Chains
 */
export const TON_MAINNET_CHAINS = {
  'ton:-239': {
    chainId: '-239',
    name: 'TON',
    logo: '/chain-logos/ton.png',
    rgb: '0, 136, 204',
    rpc: tonCenterRpc(false),
    namespace: 'ton'
  }
}

export const TON_TEST_CHAINS = {
  'ton:-3': {
    chainId: '-3',
    name: 'TON Testnet',
    logo: '/chain-logos/ton.png',
    rgb: '0, 136, 204',
    rpc: tonCenterRpc(true),
    namespace: 'ton'
  }
}

export const TON_CHAINS = { ...TON_MAINNET_CHAINS, ...TON_TEST_CHAINS }

/**
 * Methods
 */
export const TON_SIGNING_METHODS = {
  SEND_MESSAGE: 'ton_sendMessage',
  SIGN_DATA: 'ton_signData'
}
