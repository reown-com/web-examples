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
  id: string; // Unique identifier for the token
  type: "erc20" | "native" 
  name: string;
  icon: string;
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
    id: "USDC",
    type: "erc20",
    name: "USDC",
    icon: "/token-images/USDC.png",
    supportedChainIds: [arbitrum.id, base.id, optimism.id],
    decimals: 6,
  },
  {
    id: "USDT",
    type: "erc20",
    name: "USDT",
    icon: "/token-images/USDT.png",
    supportedChainIds: [arbitrum.id, optimism.id],
    decimals: 6,
  },
  {
    id: "USDS",
    type: "erc20",
    name: "USDS",
    icon: "/token-images/USDS(DAI).png",
    supportedChainIds: [base.id],
    decimals: 18,
  },
  {
    id: "ETH",
    type: "native",
    name: "ETH",
    icon: "/token-images/ETH.png",
    supportedChainIds: [arbitrum.id, base.id, optimism.id],
    decimals: 18,
  }
];

export function isTokenSupportedOnNetwork(
  token: Token,
  networkChainId: number
): boolean {
  return token.supportedChainIds.includes(networkChainId);
}
