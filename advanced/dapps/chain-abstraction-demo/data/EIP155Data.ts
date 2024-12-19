export interface Network {
  name: string;
  icon: string;
  chainId: number;
}

export interface Token {
  name: string;
  icon: string;
  address: string;
}

export const supportedNetworks: Network[] = [
  {
    name: "Arbitrum",
    icon: "/chain-logos/arbitrum.png",
    chainId: 42161,
  },
  {
    name: "Base",
    icon: "/chain-logos/base.webp",
    chainId: 8542,
  },
  {
    name: "Optimism",
    icon: "/chain-logos/eip155-10.png",
    chainId: 10,
  },
];

export const supportedTokens: Token[] = [
  {
    name: "USDC",
    icon: "/token-images/USDC.png",
    address: "0x1",
  },
  {
    name: "USDT",
    icon: "/token-images/USDT.png",
    address: "0x2",
  },
];
