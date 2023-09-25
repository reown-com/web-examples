import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import SolanaWallet, { SolanaSignTransaction } from 'solana-wallet'

/**
 * Types
 */
interface IInitArguments {
  secretKey?: Uint8Array
}

/**
 * Library
 */
export default class SolanaLib {
  keypair: Keypair
  solanaWallet: SolanaWallet

  constructor(keypair: Keypair) {
    this.keypair = keypair
    this.solanaWallet = new SolanaWallet(Buffer.from(keypair.secretKey))
  }

  static init({ secretKey }: IInitArguments) {
    const keypair = secretKey ? Keypair.fromSecretKey(secretKey) : Keypair.generate()

    return new SolanaLib(keypair)
  }

  public async getAddress() {
    return await this.keypair.publicKey.toBase58()
  }

  public getSecretKey() {
    return this.keypair.secretKey.toString()
  }

  public async signMessage(message: string) {
    const signature = nacl.sign.detached(bs58.decode(message), this.keypair.secretKey)
    const bs58Signature = bs58.encode(signature)

    return { signature: bs58Signature }
  }

  public async signTransaction(
    feePayer: SolanaSignTransaction['feePayer'],
    recentBlockhash: SolanaSignTransaction['recentBlockhash'],
    instructions: SolanaSignTransaction['instructions'],
    partialSignatures?: SolanaSignTransaction['partialSignatures']
  ) {
    const { signature } = await this.solanaWallet.signTransaction(feePayer, {
      feePayer,
      instructions,
      recentBlockhash,
      partialSignatures: partialSignatures ?? []
    })

    return { signature }
  }
}
