import {
  AppKitNetwork,
  arbitrum,
  base,
  optimism,
} from "@reown/appkit/networks";

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
  supportedChainIds: number[];
  decimals: number;
}

export const supportedNetworks: Network[] = [
  {
    name: arbitrum.name,
    icon: "/chain-logos/arbitrum.png",
    chainId: arbitrum.id,
    chain: arbitrum,
  },
  {
    name: base.name,
    icon: "/chain-logos/base.webp",
    chainId: base.id,
    chain: base,
  },
  {
    name: optimism.name,
    icon: "/chain-logos/eip155-10.png",
    chainId: optimism.id,
    chain: optimism,
  },
];

export const supportedTokens: Token[] = [
  {
    name: "USDC",
    icon: "/token-images/USDC.png",
    address: "0x1",
    supportedChainIds: [arbitrum.id, base.id, optimism.id],
    decimals: 6
  },
  {
    name: "USDT",
    icon: "/token-images/USDT.png",
    address: "0x2",
    supportedChainIds: [arbitrum.id, optimism.id],
    decimals: 6
  },
  {
    name: "USDS",
    icon: "/token-images/USDS(DAI).png",
    address: "0x3",
    supportedChainIds: [base.id],
    decimals: 18
  },
];

export function isTokenSupportedOnNetwork(
  token: Token,
  networkChainId: number
): boolean {
  return token.supportedChainIds.includes(networkChainId);
}
