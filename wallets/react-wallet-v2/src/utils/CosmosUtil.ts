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
  keyring: MnemonicKeyring
  wallet: CosmosWallet
  derivationPath: string

  constructor(keyring: MnemonicKeyring, wallet: CosmosWallet, derivationPath: string) {
    this.wallet = wallet
    this.keyring = keyring
    this.derivationPath = derivationPath
  }

  static async init({ mnemonic, path }: IInitArguments) {
    const keyring = await MnemonicKeyring.init({ mnemonic })
    const derivationPath = path ?? DEFAULT_PATH
    const wallet = await CosmosWallet.init(keyring.getPrivateKey(derivationPath))
    return new Cosmos(keyring, wallet, derivationPath)
  }

  public getPublicKey() {
    return this.keyring.getPublicKey(this.derivationPath)
  }
}
