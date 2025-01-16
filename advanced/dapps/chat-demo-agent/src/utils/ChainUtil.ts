import * as viemChains from "viem/chains";

export class ChainUtil {
  static getChain(id: number): viemChains.Chain | undefined {
    const chains = Object.values(viemChains) as viemChains.Chain[];
    return chains.find((x) => x.id === id);
  }

  static getValidatedChain(chainIdHex: string): viemChains.Chain {
    const chainId = parseInt(chainIdHex, 16);
    if (!chainId) {
      throw new Error("Chain ID not available in granted permissions");
    }

    const chain = this.getChain(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    return chain;
  }
}