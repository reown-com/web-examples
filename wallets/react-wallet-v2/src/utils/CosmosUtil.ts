import { Secp256k1Wallet } from '@cosmjs/amino'
import { fromHex } from '@cosmjs/encoding'
import { DirectSecp256k1Wallet, makeSignBytes } from '@cosmjs/proto-signing'
// @ts-expect-error
import { SignDoc } from '@cosmjs/proto-signing/build/codec/cosmos/tx/v1beta1/tx'
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
  prefix?: string
}

/**
 * Utility
 */
export class Cosmos {
  private keyring: MnemonicKeyring
  private directSigner: DirectSecp256k1Wallet
  private aminoSigner: Secp256k1Wallet

  constructor(
    keyring: MnemonicKeyring,
    directSigner: DirectSecp256k1Wallet,
    aminoSigner: Secp256k1Wallet
  ) {
    this.directSigner = directSigner
    this.keyring = keyring
    this.aminoSigner = aminoSigner
  }

  static async init({ mnemonic, path, prefix }: IInitArguments) {
    const keyring = await MnemonicKeyring.init({ mnemonic })
    const privateKey = fromHex(keyring.getPrivateKey(path ?? DEFAULT_PATH))
    const chainPrefix = prefix ?? 'cosmos'
    const directSigner = await DirectSecp256k1Wallet.fromKey(privateKey, chainPrefix)
    const aminoSigner = await Secp256k1Wallet.fromKey(privateKey, chainPrefix)

    return new Cosmos(keyring, directSigner, aminoSigner)
  }

  public async getAccount(number = 0) {
    const account = await this.directSigner.getAccounts()

    return account[number]
  }

  public getMnemonic() {
    return this.keyring.mnemonic
  }

  public async signDirect(address: string, signDoc: SignDoc) {
    console.log(signDoc)
    const signDocBytes = makeSignBytes(signDoc)
    // @ts-expect-error
    return await this.directSigner.signDirect(address, signDocBytes)
  }

  public async signAmino(address: string, signDoc: SignDoc) {
    return await this.aminoSigner.signAmino(address, signDoc)
  }
}
