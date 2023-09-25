import { Secp256k1Wallet, StdSignDoc } from '@cosmjs/amino'
import { fromHex } from '@cosmjs/encoding'
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing'
// @ts-expect-error
import { SignDoc } from '@cosmjs/proto-signing/build/codec/cosmos/tx/v1beta1/tx'
import Keyring from 'mnemonic-keyring'

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/118'/0'/0/0"
const DEFAULT_PREFIX = 'cosmos'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
  prefix?: string
}

/**
 * Library
 */
export default class CosmosLib {
  private keyring: Keyring
  private directSigner: DirectSecp256k1Wallet
  private aminoSigner: Secp256k1Wallet

  constructor(keyring: Keyring, directSigner: DirectSecp256k1Wallet, aminoSigner: Secp256k1Wallet) {
    this.directSigner = directSigner
    this.keyring = keyring
    this.aminoSigner = aminoSigner
  }

  static async init({ mnemonic, path, prefix }: IInitArguments) {
    const keyring = await Keyring.init({ mnemonic: mnemonic ?? Keyring.generateMnemonic() })
    const privateKey = fromHex(keyring.getPrivateKey(path ?? DEFAULT_PATH))
    const directSigner = await DirectSecp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)
    const aminoSigner = await Secp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)

    return new CosmosLib(keyring, directSigner, aminoSigner)
  }

  public getMnemonic() {
    return this.keyring.mnemonic
  }

  public async getAddress() {
    const account = await this.directSigner.getAccounts()

    return account[0].address
  }

  public async signDirect(address: string, signDoc: SignDoc) {
    return await this.directSigner.signDirect(address, signDoc)
  }

  public async signAmino(address: string, signDoc: StdSignDoc) {
    return await this.aminoSigner.signAmino(address, signDoc)
  }
}
