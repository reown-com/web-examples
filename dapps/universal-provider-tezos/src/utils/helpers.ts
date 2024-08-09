import UniversalProvider from "@walletconnect/universal-provider";
import { DEFAULT_TEZOS_KINDS, DEFAULT_TEZOS_METHODS } from "./samples";
import { TezosToolkit } from '@taquito/taquito';

export enum tezosChains {
  MainnetBeta = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  Devnet = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
}

export interface ChainData {
  name: string;
  id: string;
  rpc: string[];
  slip44: number;
  testnet: boolean;
  api?: string;
}
export interface ChainsMap {
  [reference: string]: ChainData;
}

export const TezosChainData: ChainsMap = {
  mainnet: {
    name: "Tezos",
    id: "tezos:mainnet",
    rpc: ["https://rpc.tzbeta.net"],
    api: "https://api.tzkt.io/v1",
    slip44: 1729,
    testnet: false,
  },
  testnet: {
    name: "Tezos Testnet",
    id: "tezos:testnet",
    rpc: ["https://rpc.ghostnet.teztnets.com"],
    api: "https://api.ghostnet.tzkt.io/v1",
    slip44: 1729,
    testnet: true,
  },
};

// Singleton class to manage TezosToolkit instances
class TezosInstanceManager {
  private static instances: Map<string, TezosToolkit> = new Map();

  private constructor() { }

  public static getTezosInstance(networkId: string): TezosToolkit {
    if (!TezosChainData[networkId]) {
      throw new Error(`Unsupported networkId: ${networkId}`);
    }

    if (!this.instances.has(networkId)) {
      const rpc = TezosChainData[networkId].rpc[0];
      this.instances.set(networkId, new TezosToolkit(rpc));
    }

    return this.instances.get(networkId)!;
  }
}
export default TezosInstanceManager;


export async function apiGetTezosAccountBalance(
  address: string,
  networkId: string
) {
  const Tezos = TezosInstanceManager.getTezosInstance(networkId);
  const balance = await Tezos.tz.getBalance(address);
  const balanceInTez = balance.toNumber();
  console.log(`Got balance: ${balanceInTez} ꜩ`);

  return {
    balance: (balanceInTez).toString(),
    symbol: "XTZ",
    name: "XTZ",
  };
}

export async function apiGetContractAddress(
  chainId: string, // Remove this line if the parameter is not used in the function body.
  hash: string
): Promise<string[]> {
  const [_, networkId] = chainId.split(":");

  if (!hash) {
    throw new Error(`No hash provided`);
  }

  // check if networkId is in the list of TezosChainData
  if (!TezosChainData[networkId]) {
    throw new Error(`Unsupported networkId: ${networkId}`);
  }
  const api = TezosChainData[networkId].api;
  const path = `${api}/operations/${hash}`;
  console.log(`Fetching contract address from: ${path}`);

  return fetch(path)
    .then((response) => response.json())
    .then((data) => {
      return data
        .map((op: any) => {
          const address = op?.status === 'applied' && op?.originatedContract?.kind === "smart_contract" ? op.originatedContract.address : '';
          if (address) {
            console.log('Got contract address:', address);
          }
          return address;
        })
        .filter((address: string) => address.length);
    });
}

export function getChainId(chain: string): string {
  return chain.includes(":") ? chain.split(":")[1] : chain;
}

export const getAccounts = async (
  chainId: string,
  provider: UniversalProvider,
  address: string
) => {
  console.log("TezosRpc getAccounts helper: ", chainId, provider, address);
  const result = await provider!.request<Array<{ address: string}>>({
    method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
    params: {},
  },
  chainId);

  const addresses = result.map((account: { address: any; }) => account.address);
  // setAddresses(addresses);
  console.log("TezosRpc received addresses: ", addresses);

  return {
    method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
    address,
    valid: true,
    result: JSON.stringify(result, null, 2),
  };
};

export const signMessage = async (
  chainId: string,
  provider: UniversalProvider,
  address: string
) => {
    const payload = "05010000004254";
    const result = await provider!.request<{ signature: string }>({
      method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
      params: {
        account: address,
        payload,
      },
    },
    chainId);

    return {
      method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
      address,
      valid: true,
      result: result.signature,
    };
};

export const sendTransaction = async (
  chainId: string,
  provider: UniversalProvider,
  address: string,
  method: DEFAULT_TEZOS_METHODS,
  contractAddress?: string
) => {
  let operation;
  switch (method) {
    case DEFAULT_TEZOS_METHODS.TEZOS_SEND_TRANSACTION:
      operation = DEFAULT_TEZOS_KINDS[method]
      break;

    case DEFAULT_TEZOS_METHODS.TEZOS_SEND_DELEGATION:
      operation = DEFAULT_TEZOS_KINDS[method]
      break;

    case DEFAULT_TEZOS_METHODS.TEZOS_SEND_UNDELEGATION:
      operation = DEFAULT_TEZOS_KINDS[method]
      break;

    case DEFAULT_TEZOS_METHODS.TEZOS_SEND_ORGINATION:
      operation = DEFAULT_TEZOS_KINDS[method]
      break;

    case DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL:
      // make deep copy of the operation
      operation = JSON.parse(JSON.stringify(DEFAULT_TEZOS_KINDS[DEFAULT_TEZOS_METHODS.TEZOS_SEND_CONTRACT_CALL]));
      operation.destination = contractAddress
        ? contractAddress
        : "[ERROR: example dApp was unable to set the contractAddress. Not provided.]";
      break;

    default:
      throw new Error('Unsupported method ${method}');
  }

  console.log("TezosRpc operation: ", operation);
  const result = await provider!.request<{ hash: string }>({
    method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
    params: {
      account: address,
      operations: [operation],
    },
  });

  return {
    method,
    address,
    valid: true,
    result: result.hash,
  };
};
