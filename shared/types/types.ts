export interface AssetData {
  symbol: string;
  name: string;
  contractAddress?: string;
  balance?: string;
  decimals?: number;
}

export interface ChainData {
  name: string;
  id: string;
  rpc: string[];
  slip44: number;
  testnet: boolean;
}

export interface ChainsMap {
  [reference: string]: ChainData;
}

export interface ChainMetadata {
  name?: string;
  logo: string;
  rgb: string;
}

export interface NamespaceMetadata {
  [reference: string]: ChainMetadata;
}

export interface ChainNamespaces {
  [namespace: string]: ChainsMap;
}

export interface ChainRequestRender {
  label: string;
  value: string;
}

// Modern chain structure used by wallet-v2
export interface ChainInfo {
  chainId: string | number;
  name: string;
  logo: string;
  rgb: string;
  rpc: string;
  namespace: string;
  smartAccountEnabled?: boolean;
}

export type ChainRecord = Record<string, ChainInfo>;

export interface AccountAction {
  method: string;
  callback: (chainId: string, address: string) => Promise<void>;
}

export interface AccountBalances {
  [account: string]: AssetData[];
}

export interface KadenaAccount {
  publicKey: string; // Kadena public key
  account: string; // Kadena account
  chainId: any; // Kadena ChainId
}

export interface IUTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

export type SendCallsParams = {
  version: string;
  chainId: `0x${string}`; // Hex chain id
  from: `0x${string}`;
  calls: {
    to?: `0x${string}` | undefined;
    data?: `0x${string}` | undefined;
    value?: `0x${string}` | undefined; // Hex value
  }[];
  capabilities?: Record<string, any> | undefined;
};

// capability names as string literals
export type CapabilityName = "atomicBatch" | "paymasterService" | "sessionKey";
// Capability type where each key is a capability name and value has `supported` field
export type Capabilities = {
  [K in CapabilityName]: {
    supported: boolean;
  };
};
// GetCapabilitiesResult type using mapped types
export type GetCapabilitiesResult = Record<string, Capabilities>;

export type GetCallsResult = {
  status: "PENDING" | "CONFIRMED";
  receipts?: {
    logs: {
      address: `0x${string}`;
      data: `0x${string}`;
      topics: `0x${string}`[];
    }[];
    status: `0x${string}`; // Hex 1 or 0 for success or failure, respectively
    blockHash: `0x${string}`;
    blockNumber: `0x${string}`;
    gasUsed: `0x${string}`;
    transactionHash: `0x${string}`;
  }[];
};

export type WalletGrantPermissionsParameters = {
  signer?:
    | {
        type: string;
        data?: unknown | undefined;
      }
    | undefined;
  permissions: readonly {
    data: unknown;
    policies: readonly {
      data: unknown;
      type: string;
    }[];
    required?: boolean | undefined;
    type: string;
  }[];
  expiry: number;
};

export type WalletGrantPermissionsReturnType = {
  expiry: number;
  factory?: `0x${string}` | undefined;
  factoryData?: string | undefined;
  grantedPermissions: readonly {
    data: unknown;
    policies: readonly {
      data: unknown;
      type: string;
    }[];
    required?: boolean | undefined;
    type: string;
  }[];
  permissionsContext: string;
  signerData?:
    | {
        userOpBuilder?: `0x${string}` | undefined;
        submitToAddress?: `0x${string}` | undefined;
      }
    | undefined;
};
