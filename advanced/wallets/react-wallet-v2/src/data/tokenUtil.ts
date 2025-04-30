export type EIP155Token = {
  name: string
  icon: string
  assetAddress?: string
  symbol: string
  decimals: number
}

const ALL_TOKENS: EIP155Token[] = [
  {
    name: 'USDC',
    icon: '/token-logos/USDC.png',
    symbol: 'USDC',
    decimals: 6
  },
  {
    name: 'USDT',
    icon: '/token-logos/USDT.png',
    symbol: 'USDT',
    decimals: 6
  },
  {
    name: 'ETH',
    icon: '/token-logos/ETH.png',
    symbol: 'ETH',
    decimals: 18
  },
  {
    name: 'SOL',
    icon: '/token-logos/SOL.png',
    symbol: 'SOL',
    decimals: 9
  }
]

export function getTokenData(tokenSymbol: string) {
  return Object.values(ALL_TOKENS).find(token => token.symbol === tokenSymbol)
}

const SOLANA_KNOWN_TOKENS = [
  {
    name: 'USDC',
    icon: '/token-logos/USDC.png',
    symbol: 'USDC',
    decimals: 6,
    assetAddress: [
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    ]
  }
]

export function getSolanaTokenData(caip19AssetAddress: string) {
  return SOLANA_KNOWN_TOKENS.find(token => token.assetAddress.includes(caip19AssetAddress))
}
