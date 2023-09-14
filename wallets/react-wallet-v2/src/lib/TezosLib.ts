import { TezosToolkit } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import { localForger } from '@taquito/local-forging'
import Keyring from 'mnemonic-keyring'

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/1729'/0'/0'"
const DEFAULT_CURVE = 'ed25519'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
  curve?: 'ed25519' | 'secp256k1'
}

/**
 * Library
 */
export default class TezosLib {
  tezos: TezosToolkit
  signer: InMemorySigner
  mnemonic: string
  secretKey: string
  publicKey: string
  address: string
  curve: 'ed25519' | 'secp256k1'

  constructor(
    tezos: TezosToolkit,
    mnemonic: string,
    signer: InMemorySigner,
    secretKey: string,
    publicKey: string,
    address: string,
    curve: 'ed25519' | 'secp256k1'
  ) {
    this.tezos = tezos
    this.mnemonic = mnemonic
    this.signer = signer
    this.secretKey = secretKey
    this.publicKey = publicKey
    this.address = address
    this.curve = curve
  }

  static async init({ mnemonic, path, curve }: IInitArguments) {
    const params = {
      mnemonic: mnemonic ?? Keyring.generateMnemonic(),
      derivationPath: path ?? DEFAULT_PATH,
      curve: curve ?? DEFAULT_CURVE
    }

    const Tezos = new TezosToolkit('https://mainnet.api.tez.ie')

    const signer = InMemorySigner.fromMnemonic(params)

    Tezos.setSignerProvider(signer)

    const secretKey = await signer.secretKey()
    const publicKey = await signer.publicKey()
    const address = await signer.publicKeyHash()

    return new TezosLib(Tezos, params.mnemonic, signer, secretKey, publicKey, address, params.curve)
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public getPublicKey() {
    return this.publicKey
  }

  public getCurve() {
    return this.curve
  }

  public getAddress() {
    return this.address
  }

  public async signTransaction(transaction: any) {
    const prepared = await this.tezos.prepare.batch(
      transaction.map((tx: any) => ({
        amount: tx.amount,
        to: tx.destination,
        kind: tx.kind,
        mutez: true
      }))
    )

    const forged = await localForger.forge(prepared.opOb)

    const tx = await this.signer.sign(forged, new Uint8Array([3]))

    const hash = await this.tezos.rpc.injectOperation(tx.sbytes)

    return hash
  }

  public async signPayload(payload: any) {
    return await this.signer.sign(payload)
  }
}
