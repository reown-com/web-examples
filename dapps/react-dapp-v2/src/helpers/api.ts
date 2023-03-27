import axios, { AxiosInstance } from "axios";
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
};

const api: AxiosInstance = axios.create({
  baseURL: "https://ethereum-api.xyz",
  timeout: 10000, // 10 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export async function apiGetAccountBalance(
  address: string,
  chainId: string
): Promise<AssetData> {
  const namespace = chainId.split(":")[0];
  if (namespace !== "eip155") {
    return { balance: "", symbol: "", name: "" };
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
