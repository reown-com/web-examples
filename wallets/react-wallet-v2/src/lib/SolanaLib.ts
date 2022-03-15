import { Keypair, PublicKey, Transaction, TransactionInstructionCtorFields } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

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

  constructor(keypair: Keypair) {
    this.keypair = keypair
  }

  static init({ secretKey }: IInitArguments) {
    const keypair = secretKey ? Keypair.fromSecretKey(secretKey) : Keypair.generate()

    return new SolanaLib(keypair)
  }

  public async getAccount() {
    return await this.keypair.publicKey.toBase58()
  }

  public async signMessage(message: string) {
    const signature = nacl.sign.detached(bs58.decode(message), this.keypair.secretKey)

    return signature
  }

  public async signTransaction(
    feePayer: string,
    recentBlockhash: string,
    instructions: TransactionInstructionCtorFields[]
  ) {
    const tx = new Transaction({
      feePayer: new PublicKey(feePayer),
      recentBlockhash
    })

    tx.add(
      ...instructions.map(i => ({
        programId: new PublicKey(i.programId),
        data: i.data ? Buffer.from(i.data) : Buffer.from([]),
        keys: i.keys.map(k => ({
          ...k,
          pubkey: new PublicKey(k.pubkey)
        }))
      }))
    )

    await tx.sign(this.keypair)

    const { signature } = tx.signatures[tx.signatures.length - 1]

    return { signature }
  }
}
