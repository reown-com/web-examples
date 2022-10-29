import axios, { AxiosInstance } from "axios";
import Pact from "pact-lang-api";

import { AssetData } from "./types";

const rpcProvidersByChainId: Record<number, any> = {
  1: {
    name: "Ethereum Mainnet",
    baseURL: "https://mainnet.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  5: {
    name: "Ethereum Goerli",
    baseURL: "https://goerli.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  137: {
    name: "Polygon Mainnet",
    baseURL: "https://polygon-rpc.com",
    token: {
      name: "Matic",
      symbol: "MATIC",
    },
  },
  80001: {
    name: "Polygon Mumbai",
    baseURL: "https://rpc-mumbai.maticvigil.com",
    token: {
      name: "Matic",
      symbol: "MATIC",
    },
  },
  10: {
    name: "Optimism",
    baseURL: "https://mainnet.optimism.io",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  420: {
    name: "Optimism Goerli",
    baseURL: "https://goerli.optimism.io",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  42161: {
    name: "Arbitrum",
    baseURL: "https://arb1.arbitrum.io/rpc",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  421611: {
    name: "Arbitrum Rinkeby",
    baseURL: "https://rinkeby.arbitrum.io/rpc",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  100: {
    name: "xDAI",
    baseURL: "https://xdai-archive.blockscout.com",
    token: {
      name: "xDAI",
      symbol: "xDAI",
    },
  },
  42220: {
    name: "Celo",
    baseURL: "https://forno.celo.org",
    token: {
      name: "CELO",
      symbol: "CELO",
    },
  },
  44787: {
    name: "Celo",
    baseURL: "https://alfajores-forno.celo-testnet.org",
    token: {
      name: "CELO",
      symbol: "CELO",
    },
  },
  111111: {
    name: "Kadena",
    baseURL: "https://api.chainweb.com",
    token: {
      name: "KDA",
      symbol: "KDA",
    },
  },
};

const api: AxiosInstance = axios.create({
  baseURL: "https://ethereum-api.xyz",
  timeout: 10000, // 10 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

async function apiGetKadenaAccountBalance(
  publicKey: string,
  WCNetworkId: string
) {
  const CHAIN_ID = "0";
  const API_HOST = `https://api.testnet.chainweb.com/chainweb/0.0/${WCNetworkId}/chain/${CHAIN_ID}/pact`;

  const KEY_PAIR = {
    publicKey,
    secretKey: "",
  };

  const cmd = {
    networkId: WCNetworkId,
    keyPairs: KEY_PAIR,
    pactCode: `(coin.get-balance "${publicKey}")`,
    envData: {},
    meta: {
      creationTime: Math.round(new Date().getTime() / 1000),
      ttl: 28000,
      gasLimit: 600,
      chainId: CHAIN_ID,
      gasPrice: 0.0000001,
      sender: KEY_PAIR.publicKey,
    },
  };

  try {
    const result = await Pact.fetch.local(cmd, API_HOST);

    console.log(result);
  } catch (e) {
    console.log(e);
  }

  return { balance: "100000000000000000000000", symbol: "KDA", name: "KDA" };
}

export async function apiGetAccountBalance(
  address: string,
  chainId: string
): Promise<AssetData> {
  console.log({ chainId });
  const [namespace, networkId] = chainId.split(":");

  if (namespace === "kadena") {
    return apiGetKadenaAccountBalance(address, networkId);
  }

  const ethChainId = chainId.split(":")[1];
  const rpc = rpcProvidersByChainId[Number(ethChainId)];
  if (!rpc) {
    return { balance: "", symbol: "", name: "" };
  }
  const { baseURL, token } = rpc;
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"],
    id: 1,
  });
  const { result } = response.data;
  const balance = parseInt(result, 16).toString();
  return { balance, ...token };
}

export const apiGetAccountNonce = async (
  address: string,
  chainId: string
): Promise<number> => {
  const ethChainId = chainId.split(":")[1];
  const { baseURL } = rpcProvidersByChainId[Number(ethChainId)];
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_getTransactionCount",
    params: [address, "latest"],
    id: 1,
  });
  const { result } = response.data;
  const nonce = parseInt(result, 16);
  return nonce;
};

export const apiGetGasPrice = async (chainId: string): Promise<string> => {
  const ethChainId = chainId.split(":")[1];
  const { baseURL } = rpcProvidersByChainId[Number(ethChainId)];
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_gasPrice",
    params: [],
    id: 1,
  });
  const { result } = response.data;
  return result;
};
