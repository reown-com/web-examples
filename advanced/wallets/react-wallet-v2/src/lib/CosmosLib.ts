import { Secp256k1Wallet, StdSignDoc } from '@cosmjs/amino'
import { fromHex } from '@cosmjs/encoding'
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing'
// @ts-expect-error
import { SignDoc } from '@cosmjs/proto-signing/build/codec/cosmos/tx/v1beta1/tx'
import { Wallet } from 'ethers'

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
  private mnemonic: string
  private directSigner: DirectSecp256k1Wallet
  private aminoSigner: Secp256k1Wallet

  constructor(mnemonic: string, directSigner: DirectSecp256k1Wallet, aminoSigner: Secp256k1Wallet) {
    this.directSigner = directSigner
    this.mnemonic = mnemonic
    this.aminoSigner = aminoSigner
  }

  static async init({ mnemonic, path, prefix }: IInitArguments) {
    const wallet = mnemonic
      ? Wallet.fromMnemonic(mnemonic, path ?? DEFAULT_PATH)
      : Wallet.createRandom({ path: path ?? DEFAULT_PATH })
    const privateKey = fromHex(wallet.privateKey.replace('0x', ''))
    const directSigner = await DirectSecp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)
    const aminoSigner = await Secp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)

    return new CosmosLib(wallet.mnemonic.phrase, directSigner, aminoSigner)
  }

  public getMnemonic() {
    return this.mnemonic
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
