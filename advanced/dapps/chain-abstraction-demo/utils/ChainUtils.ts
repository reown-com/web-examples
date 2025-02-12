import * as viemChains from "viem/chains";


export const ChainUtils = {

  getChainConfig : (chainId: number) => {
  const chain =  Object.values(viemChains).find((chain) => chain.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
}

}