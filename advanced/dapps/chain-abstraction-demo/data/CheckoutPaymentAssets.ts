export interface SupportedAsset {
  id: string;          // Full CAIP-19 asset identifier
  name: string;        // Human-readable name
  symbol: string;      // Token symbol (e.g., "USDC", "ETH")
  decimals: number;    // Number of decimals for formatting
  chainId: string;     // Chain ID (e.g., "84532", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1")
  chainName: string;   // Chain name (e.g., "Base Sepolia", "Solana Devnet")
  tokenAddress?: string; // Contract address for tokens (undefined for native)
  isNative: boolean;   // Whether this is a native asset
  logoUrl: string;     // URL to the asset's logo
}

export const supportedPaymentsAsset: SupportedAsset[] = [
  {
    id: 'eip155:84532/erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    chainId: '84532',
    chainName: 'Base Sepolia',
    tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    isNative: false,
    logoUrl: '/token-images/USDC.png'
  },
  {
    id: 'eip155:11155420/erc20:0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    chainId: '11155420',
    chainName: 'Optimism Sepolia',
    tokenAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    isNative: false,
    logoUrl: '/token-images/USDC.png'
  },
  {
    id: 'eip155:84532/slip44:60',
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    chainId: '84532',
    chainName: 'Base Sepolia',
    isNative: true,
    logoUrl: '/chain-logos/ETH.png'
  },
  {
    id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    chainName: 'Solana Devnet',
    tokenAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    isNative: false,
    logoUrl: '/token-images/USDC.png'
  },
  {
    id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
    name: 'SOL',
    symbol: 'SOL',
    decimals: 9,
    chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    chainName: 'Solana Devnet',
    isNative: true,
    logoUrl: '/chain-logos/SOL.png'
  }
]


export const supportChains = [{
  id: 'eip155:84532',
  name: 'Base Sepolia',
  logoUrl: '/chain-logos/base.webp'
}, {
  id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  name: 'Solana Devnet',
  logoUrl: '/chain-logos/SOL.png'
},
{
  id: 'eip155:11155420',
  name: 'Optimism Sepolia',
  logoUrl: '/chain-logos/eip155-10.png'
}
]

export const getChainLogoUrl = (chainId: string): string => {
  const chain = supportChains.find(chain => chain.id.includes(chainId));
  return chain?.logoUrl || '/chain-logos/chain-placeholder.png';
};