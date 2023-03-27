import { ProposalTypes } from "@walletconnect/types";
import {
  DEFAULT_COSMOS_EVENTS,
  DEFAULT_COSMOS_METHODS,
  DEFAULT_EIP155_METHODS,
  DEFAULT_EIP_155_EVENTS,
  DEFAULT_SOLANA_EVENTS,
  DEFAULT_SOLANA_METHODS,
  DEFAULT_POLKADOT_EVENTS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_NEAR_EVENTS,
  DEFAULT_ELROND_EVENTS,
  DEFAULT_ELROND_METHODS,
  DEFAULT_TRON_METHODS,
  DEFAULT_TRON_EVENTS,
} from "../constants";

export const getNamespacesFromChains = (chains: string[]) => {
  const supportedNamespaces: string[] = [];
  chains.forEach((chainId) => {
    const [namespace] = chainId.split(":");
    if (!supportedNamespaces.includes(namespace)) {
      supportedNamespaces.push(namespace);
    }
  });

  return supportedNamespaces;
};

export const getSupportedMethodsByNamespace = (namespace: string) => {
  switch (namespace) {
    case "eip155":
      return Object.values(DEFAULT_EIP155_METHODS);
    case "cosmos":
      return Object.values(DEFAULT_COSMOS_METHODS);
    case "solana":
      return Object.values(DEFAULT_SOLANA_METHODS);
    case "polkadot":
      return Object.values(DEFAULT_POLKADOT_METHODS);
    case "near":
      return Object.values(DEFAULT_NEAR_METHODS);
    case "elrond":
      return Object.values(DEFAULT_ELROND_METHODS);
    case "tron":
      return Object.values(DEFAULT_TRON_METHODS);
    default:
      throw new Error(`No default methods for namespace: ${namespace}`);
  }
};

export const getSupportedEventsByNamespace = (namespace: string) => {
  switch (namespace) {
    case "eip155":
      return Object.values(DEFAULT_EIP_155_EVENTS);
    case "cosmos":
      return Object.values(DEFAULT_COSMOS_EVENTS);
    case "solana":
      return Object.values(DEFAULT_SOLANA_EVENTS);
    case "polkadot":
      return Object.values(DEFAULT_POLKADOT_EVENTS);
    case "near":
      return Object.values(DEFAULT_NEAR_EVENTS);
    case "elrond":
      return Object.values(DEFAULT_ELROND_EVENTS);
    case "tron":
      return Object.values(DEFAULT_TRON_EVENTS);
    default:
      throw new Error(`No default events for namespace: ${namespace}`);
  }
};

export const getRequiredNamespaces = (
  chains: string[]
): ProposalTypes.RequiredNamespaces => {
  const selectedNamespaces = getNamespacesFromChains(chains);
  console.log("selected namespaces:", selectedNamespaces);

  return Object.fromEntries(
    selectedNamespaces.map((namespace) => [
      namespace,
      {
        methods: getSupportedMethodsByNamespace(namespace),
        chains: chains.filter((chain) => chain.startsWith(namespace)),
        events: getSupportedEventsByNamespace(namespace) as any[],
      },
    ])
  );
};
