export type EIP155Token = {
  name: string
  icon: string
  address?: string
  symbol: string
}

const ALL_TOKENS: EIP155Token[] = [
    {
      name: "USDC",
      icon: "/token-logos/USDC.png",
      symbol: "USDC",
    },
    {
      name: "USDT",
      icon: "/token-logos/USDT.png",
      symbol: "USDT",
    },
    {
      name: "ETH",
      icon: "/token-logos/ETH.png",
      symbol: "ETH",
    },
    
]

export function getTokenData(tokenSymbol: string) {
  return Object.values(ALL_TOKENS).find(
    token => token.symbol === tokenSymbol
  )
}