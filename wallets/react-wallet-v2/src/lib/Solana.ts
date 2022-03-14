import { Keypair } from '@solana/web3.js'

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
}
