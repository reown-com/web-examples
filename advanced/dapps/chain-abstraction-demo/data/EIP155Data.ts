import { AppKitNetwork, arbitrum, base, optimism } from "@reown/appkit/networks";

export interface Network {
  name: string;
  icon: string;
  chainId: number;
  chain: AppKitNetwork;
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
    chain:arbitrum
  },
  {
    name: "Base",
    icon: "/chain-logos/base.webp",
    chainId: 8542,
    chain:base
  },
  {
    name: "Optimism",
    icon: "/chain-logos/eip155-10.png",
    chainId: 10,
    chain:optimism
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
