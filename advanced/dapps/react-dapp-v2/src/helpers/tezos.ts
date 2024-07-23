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
  