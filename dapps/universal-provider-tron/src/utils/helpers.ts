

import UniversalProvider from "@walletconnect/universal-provider";
import TronWeb from "tronweb";

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

export const signTransacion = async (
  message: string,
  provider: UniversalProvider,
  address: string
) => {

  try {
    const isTestnet = provider.session!.namespaces.tron.chains?.includes(
      `tron:${TronChains.Devnet}`
    );

    const fullHost = isTestnet
      ? "https://nile.trongrid.io/"
      : "https://api.trongrid.io/";

    const tronWeb = new TronWeb({
      fullHost,
    });

    // Take USDT as an example:
    // Nile TestNet: https://nile.tronscan.org/#/token20/TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf
    // MainNet: https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

    const contract_address = isTestnet
      ? "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
      : "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

      const options = {
        feeLimit:100000000,
        callValue:0,
        tokenValue:10,
        tokenId:1000001
    };

    var parameters = [{type:'address',value: address},{type:'uint256',value:100}];

    const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contract_address, 
        "approve(address,uint256)", 
        options,
        parameters, 
        address
      );
    
    const signedTransaction = await provider!.request<{result:any}>({
        method: "tron_signTransaction",
        params: {
          address,
          transaction,
        },
      }, "tron:0x2b6653dc" );
      
      const tx = signedTransaction.result;
      console.log("transaction", tx);

      const result = await tronWeb.trx.sendRawTransaction(tx);
      //const result = await tronWeb.trx.sendHexTransaction(tx.raw_data_hex);
      console.log("result", result);
    return {
      method: "tron_signTransaction",
      address,
      valid: true,
      result: result,
    };

  } catch (error: any) {
    throw new Error(error);
  }
};
