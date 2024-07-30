import { TezosToolkit } from '@taquito/taquito';
import { TezosChainData } from "../chains/tezos";

// Singleton class to manage TezosToolkit instances
class TezosInstanceManager {
  private static instances: Map<string, TezosToolkit> = new Map();

  private constructor() {}

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
    chainId: string,
    hash: string
  ) {
    const [_, networkId] = chainId.split(":");

    // check if networkId is in the list of TezosChainData
    if (!TezosChainData[networkId]) {
        throw new Error(`Unsupported networkId: ${networkId}`);
    }
    const api = TezosChainData[networkId].api;

    return fetch(`${api}/operations/${hash}`)
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
