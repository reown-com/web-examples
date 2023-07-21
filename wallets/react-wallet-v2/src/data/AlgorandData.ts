type ChainMetadata = {
    chainId: string
    name: string
    logo: string
    rgb: string
    rpc: string
  }
  
  /**
   * Types
   */
  export type TAlgorandChain = keyof typeof Algorand_MAINNET_CHAINS
  
  /**
   * Chains
   */
  export const Algorand_MAINNET_CHAINS: Record<string, ChainMetadata> = {
    'Algorand:mainnet': {
      chainId: 'mainnet',
      name: 'Algorand',
      logo: '/chain-logos/algorand_logo_mark_black.svg',
      rgb: '0, 0, 0',
      rpc: 'https://mainnet-algorand.api.purestake.io/ps2'
    }
  }
  
  export const Algorand_TEST_CHAINS: Record<string, ChainMetadata> = {
    'Algorand:testnet': {
      chainId: 'testnet',
      name: 'Algorand Testnet',
      logo: '/chain-logos/algorand_logo_mark_black.svg',
      rgb: '0, 0, 0',
      rpc: 'https://testnet-algorand.api.purestake.io/ps2'
    }
  }
  
  export const Algorand_CHAINS = { ...Algorand_MAINNET_CHAINS, ...Algorand_TEST_CHAINS }
  
  /**
   * Methods
   */
  export const Algorand_SIGNING_METHODS = {
    Algorand_GET_ACCOUNTS: 'Algorand_getAccounts',
    Algorand_SEND: 'Algorand_send',
    Algorand_SIGN: 'Algorand_sign'
  }
  