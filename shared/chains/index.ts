/**
 * Barrel export for all chain data
 */

export * from "./eip155";
export * from "./solana";
export * from "./cosmos";
export * from "./polkadot";
export * from "./near";
export * from "./kadena";
export * from "./multiversx";
export * from "./stacks";
export * from "./sui";
export * from "./tezos";
export * from "./ton";
export * from "./tron";
export * from "./bip122";

import { ChainData, ChainMetadata } from "../types";
import { EIP155Metadata, EIP155ChainData, EIP155Utils } from "./eip155";
import { SolanaChainData, SolanaMetadata, SolanaUtils } from "./solana";
import { CosmosChainData, CosmosMetadata, CosmosUtils } from "./cosmos";
import { PolkadotChainData, PolkadotMetadata, PolkadotUtils } from "./polkadot";
import { NearChainData, NearMetadata, NearUtils } from "./near";
import { KadenaChainData, KadenaMetadata } from "./kadena";
import {
  MultiversxChainData,
  MultiversxMetadata,
  MultiversxUtils,
} from "./multiversx";
import { StacksChainData, StacksMetadata, StacksUtils } from "./stacks";
import { SuiChainData, SuiMetadata, SuiUtils } from "./sui";
import { TezosChainData, TezosMetadata, TezosUtils } from "./tezos";
import { TonChainData, TonMetadata, TONUtils } from "./ton";
import { TronChainData, TronMetadata, TronUtils } from "./tron";
import { BtcChainData, BtcMetadata, BtcUtils } from "./bip122";

export const ALL_CHAINS = Object.freeze({
  eip155: {
    data: EIP155ChainData,
    metadata: EIP155Metadata,
    utils: EIP155Utils,
  },
  solana: {
    data: SolanaChainData,
    metadata: SolanaMetadata,
    utils: SolanaUtils,
  },
  cosmos: {
    data: CosmosChainData,
    metadata: CosmosMetadata,
    utils: CosmosUtils,
  },
  polkadot: {
    data: PolkadotChainData,
    metadata: PolkadotMetadata,
    utils: PolkadotUtils,
  },
  near: {
    data: NearChainData,
    metadata: NearMetadata,
    utils: NearUtils,
  },
  kadena: {
    data: KadenaChainData,
    metadata: KadenaMetadata,
  },
  mvx: {
    data: MultiversxChainData,
    metadata: MultiversxMetadata,
    utils: MultiversxUtils,
  },
  stacks: {
    data: StacksChainData,
    metadata: StacksMetadata,
    utils: StacksUtils,
  },
  sui: {
    data: SuiChainData,
    metadata: SuiMetadata,
    utils: SuiUtils,
  },
  tezos: {
    data: TezosChainData,
    metadata: TezosMetadata,
    utils: TezosUtils,
  },
  ton: {
    data: TonChainData,
    metadata: TonMetadata,
    utils: TONUtils,
  },
  tron: {
    data: TronChainData,
    metadata: TronMetadata,
    utils: TronUtils,
  },
  bip122: {
    data: BtcChainData,
    metadata: BtcMetadata,
    utils: BtcUtils,
  },
});

/**
 * Unified getChainMetadata function that handles all chains
 */
export function getChainMetadata(chainId: string): ChainMetadata {
  const [namespace, reference] = chainId.split(":");

  let metadata: ChainMetadata | undefined =
    ALL_CHAINS[namespace as keyof typeof ALL_CHAINS]?.metadata?.[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }

  return metadata;
}

function getMainnetChains(): string[] {
  const mainnetChains: string[] = [];
  try {
    Object.values(ALL_CHAINS).forEach((namespace) => {
      if (namespace?.data) {
        Object.values(namespace.data).forEach((chain) => {
          if (
            chain &&
            typeof chain === "object" &&
            chain.testnet === false &&
            chain.id
          ) {
            const chainId = String(chain.id);
            if (chainId) {
              mainnetChains.push(chainId);
            }
          }
        });
      }
    });
  } catch (error) {
    console.error("Error getting mainnet chains:", error);
  }
  console.log("mainnetChains", mainnetChains);
  return mainnetChains;
}

function getTestnetChains(): string[] {
  const testnetChains: string[] = [];
  try {
    Object.values(ALL_CHAINS).forEach((namespace) => {
      if (namespace?.data) {
        Object.values(namespace.data).forEach((chain) => {
          if (
            chain &&
            typeof chain === "object" &&
            chain.testnet === true &&
            chain.id
          ) {
            const chainId = String(chain.id);
            if (chainId) {
              testnetChains.push(chainId);
            }
          }
        });
      }
    });
  } catch (error) {
    console.error("Error getting testnet chains:", error);
  }
  console.log("testnetChains", testnetChains);
  return testnetChains;
}

// Create arrays explicitly to avoid webpack transpilation issues
const _mainnetChains = getMainnetChains();
const _testnetChains = getTestnetChains();

// Create new arrays explicitly to ensure webpack doesn't optimize them incorrectly
export const DEFAULT_MAINNET_CHAINS: readonly string[] = Object.freeze([
  ..._mainnetChains,
]);
export const DEFAULT_TESTNET_CHAINS: readonly string[] = Object.freeze([
  ..._testnetChains,
]);
export const DEFAULT_CHAINS: readonly string[] = Object.freeze([
  ..._mainnetChains,
  ..._testnetChains,
]);
