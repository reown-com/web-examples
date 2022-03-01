// @ts-expect-error
import { SignDoc } from '@cosmjs/proto-signing/build/codec/cosmos/tx/v1beta1/tx'
import CosmosWallet from 'cosmos-wallet'
import MnemonicKeyring from 'mnemonic-keyring'

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/118'/0'/0/0"

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
}

/**
 * Utility
 */
export class Cosmos {
  private keyring: MnemonicKeyring
  private wallet: CosmosWallet

  constructor(keyring: MnemonicKeyring, wallet: CosmosWallet) {
    this.wallet = wallet
    this.keyring = keyring
  }

  static async init({ mnemonic, path }: IInitArguments) {
    const keyring = await MnemonicKeyring.init({ mnemonic })
    const wallet = await CosmosWallet.init(keyring.getPrivateKey(path ?? DEFAULT_PATH))

    return new Cosmos(keyring, wallet)
  }

  public async getAccount(number = 0) {
    const account = await this.wallet.getAccounts()

    return account[number]
  }

  public getMnemonic() {
    return this.keyring.mnemonic
  }

  public signDirect(address: string, signDoc: SignDoc) {
    return this.wallet.signDirect(address, signDoc)
  }

  public signAmino(address: string, signDoc: SignDoc) {
    return this.wallet.signAmino(address, signDoc)
  }
}
