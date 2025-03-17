export type EIP155Token = {
  name: string
  icon: string
  address?: string
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
  }
]

export function getTokenData(tokenSymbol: string) {
  return Object.values(ALL_TOKENS).find(token => token.symbol === tokenSymbol)
}
