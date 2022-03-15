import { Keypair, PublicKey, Transaction, TransactionInstructionCtorFields } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

export class Solana {
  keypair: Keypair

  constructor(keypair: Keypair) {
    this.keypair = keypair
  }

  static init(secretKey?: Uint8Array) {
    const keypair = secretKey ? Keypair.fromSecretKey(secretKey) : Keypair.generate()

    return new Solana(keypair)
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
    instructions: TransactionInstructionCtorFields
  ) {
    const tx = new Transaction({
      feePayer: new PublicKey(feePayer),
      recentBlockhash
    })
    tx.add(instructions)
    await tx.sign(this.keypair)
    console.log(tx)
    const { signature } = tx.signatures[tx.signatures.length - 1]

    return signature
  }
}
