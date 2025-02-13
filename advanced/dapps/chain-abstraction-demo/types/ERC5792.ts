interface WalletCapability {
  wallet_getAssets?: string;
}

interface ChainCapabilities {
  walletService?: WalletCapability;
  assetDiscovery?: {
    supported: boolean;
  };
}

export interface Capabilities {
  [chainId: string]: ChainCapabilities;
}
