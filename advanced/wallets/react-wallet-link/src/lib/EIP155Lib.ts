import { HDNodeWallet, JsonRpcProvider, TransactionRequest } from 'ethers'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}
export interface EIP155Wallet {
  getMnemonic(): string
  getPrivateKey(): string
  getAddress(): string
  signMessage(message: string): Promise<string>
  _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
  connect(provider: JsonRpcProvider): HDNodeWallet
  signTransaction(transaction: TransactionRequest): Promise<string>
}

/**
 * Library
 */
export default class EIP155Lib implements EIP155Wallet {
  wallet: HDNodeWallet

  constructor(wallet: HDNodeWallet) {
    this.wallet = wallet
  }

  static init({ mnemonic }: IInitArgs) {
    const wallet = mnemonic ? HDNodeWallet.fromPhrase(mnemonic) : HDNodeWallet.createRandom()

    return new EIP155Lib(wallet)
  }

  getMnemonic() {
    return this.wallet?.mnemonic?.phrase as string
  }

  getPrivateKey() {
    return this.wallet.privateKey
  }

  getAddress() {
    return this.wallet.address
  }

  signMessage(message: string) {
    return this.wallet.signMessage(message)
  }

  _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
    return this.wallet.signTypedData(domain, types, data)
  }

  connect(provider: JsonRpcProvider) {
    return this.wallet.connect(provider)
  }

  signTransaction(transaction: TransactionRequest) {
    return this.wallet.signTransaction(transaction)
  }
}
