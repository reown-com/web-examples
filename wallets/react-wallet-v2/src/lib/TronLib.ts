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
    // wait till  WASM is initialized, in case it is not initialized already (WASM is required for 'sr25519').

    return new TronLib(privateKey)
  }

  public getAddress() {
    return this.tronWeb.defaultAddress.base58
  }

  public createAccount() {
    return this.tronWeb.createAccount()
  }

  public async signMessage(message: string) {
    const signedtxn = await this.tronWeb.trx.sign(TronWeb.toHex(message))
    return signedtxn
  }

  public async signTransaction(transaction: any) {
    const signedtxn = await this.tronWeb.trx.sign(transaction.transaction)
    return signedtxn
  }
}
