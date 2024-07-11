

import UniversalProvider from "@walletconnect/universal-provider/dist/types/UniversalProvider";
import bs58 from "bs58";
import nacl from "tweetnacl";


export enum TronChains {
  Mainnet = "0x2b6653dc",
  Devnet = "0xcd8690dc",
}

export const blockchainName = "tron";

export const getProviderUrl = (chainId: string) => {
  return `https://rpc.walletconnect.com/v1/?chainId=${chainId}&projectId=${
    import.meta.env.VITE_PROJECT_ID
  }`;
};

export const signMessage = async (
  message: string,
  provider: UniversalProvider,
  address: string
) => {

  try {
    
    const result = await provider!.request<{ signature: string }>({
      method: "tron_signMessage",
      params: {
        address,
        message,
      },
    }, "tron:0x2b6653dc" );

    return {
      method: "tron_signMessage",
      address,
      valid: true,
      result: result.signature,
    };

  } catch (error: any) {
    throw new Error(error);
  }
};

export const sendTransaction = async (
  to: string,
  amount: number,
  provider: UniversalProvider,
  address: string
) => {
  const isTestnet = provider.session!.namespaces.tron.chains?.includes(
    `${blockchainName}:${TronChains.Devnet}`
  );

 
    return {
      method: "tron_signTransaction",
      address,
      valid: true, //valid,
      result: "" //result.signature,
    };

};
