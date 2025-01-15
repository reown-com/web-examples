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
    name: arbitrum.name,
    icon: "/chain-logos/arbitrum.png",
    chainId: arbitrum.id,
    chain:arbitrum
  },
  {
    name: base.name,
    icon: "/chain-logos/base.webp",
    chainId: base.id,
    chain:base
  },
  {
    name: optimism.name,
    icon: "/chain-logos/eip155-10.png",
    chainId: optimism.id,
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
