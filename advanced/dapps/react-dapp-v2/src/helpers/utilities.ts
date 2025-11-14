import { DEFAULT_CHAINS } from "@web-examples/shared";

export const LOCALSTORAGE_KEY_TESTNET = "TESTNET";
export const INITIAL_STATE_TESTNET_DEFAULT = true;

export function setLocaleStorageTestnetFlag(value: boolean): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALSTORAGE_KEY_TESTNET, `${value}`);
  }
}

export function getLocalStorageTestnetFlag(): boolean {
  if (typeof window === "undefined") return false;
  let value = INITIAL_STATE_TESTNET_DEFAULT;
  const persisted = window.localStorage.getItem(LOCALSTORAGE_KEY_TESTNET);
  if (!persisted) {
    setLocaleStorageTestnetFlag(value);
  } else {
    value = persisted === "true" ? true : false;
  }
  return value;
}

export const getAllChainNamespaces = () => {
  const namespaces: string[] = [];
  DEFAULT_CHAINS.forEach((chainId) => {
    const [namespace] = chainId.split(":");
    if (!namespaces.includes(namespace)) {
      namespaces.push(namespace);
    }
  });
  return namespaces;
};

export const getProviderUrl = (chainId: string) => {
  return `https://rpc.walletconnect.com/v1/?chainId=${chainId}&projectId=${process.env.NEXT_PUBLIC_PROJECT_ID}`;
};
