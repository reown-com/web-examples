// @ts-ignore
import TronWeb from 'tronweb'

/**
 * Types
 */
interface IInitArguments {
  privateKey: string
}

/**
 * Library
 */
export default class TronLib {
  privateKey: string
  tronWeb: any

  constructor(privateKey: string) {
    this.privateKey = privateKey
    this.tronWeb = new TronWeb({
      // Nile TestNet, if you want to use in MainNet, change the fullHost to 'https://api.trongrid.io', or use tronWeb.setFullNode
      fullHost: 'https://nile.trongrid.io/',
      privateKey: privateKey
    })
  }

  static async init({ privateKey }: IInitArguments) {
    if(!privateKey){
      const account = TronWeb.utils.accounts.generateAccount();
      return new TronLib(account.privateKey)
    } else {
      return new TronLib(privateKey)
    }

  }

  public getAddress() {
    return this.tronWeb.defaultAddress.base58
  }

  public createAccount() {
    return this.tronWeb.createAccount()
  }

  public setFullNode(node: string) {
    return this.tronWeb.setFullNode(node)
  }

  public async signMessage(message: string) {
    const signedtxn = await this.tronWeb.trx.signMessageV2(message)
    return signedtxn
  }

  public async signTransaction(transaction: any) {
    const signedtxn = await this.tronWeb.trx.sign(transaction.transaction)
    return signedtxn
  }
}
