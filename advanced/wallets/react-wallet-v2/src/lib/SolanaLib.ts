import { Keypair, Connection, SendOptions, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { SOLANA_MAINNET_CHAINS, SOLANA_TEST_CHAINS } from '@/data/SolanaData'

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

  public async getAddress() {
    return await this.keypair.publicKey.toBase58()
  }

  public getSecretKey() {
    return this.keypair.secretKey.toString()
  }

  public async signMessage(
    params: SolanaLib.SignMessage['params']
  ): Promise<SolanaLib.SignMessage['result']> {
    const signature = nacl.sign.detached(bs58.decode(params.message), this.keypair.secretKey)
    const bs58Signature = bs58.encode(signature)

    return { signature: bs58Signature }
  }

  public async signTransaction(
    params: SolanaLib.SignTransaction['params']
  ): Promise<SolanaLib.SignTransaction['result']> {
    const transaction = this.deserialize(params.transaction)
    this.sign(transaction)

    return {
      transaction: this.serialize(transaction),
      signature: bs58.encode(transaction.signatures[0])
    }
  }

  public async signAndSendTransaction(
    params: SolanaLib.SignAndSendTransaction['params'],
    chainId: string
  ): Promise<SolanaLib.SignAndSendTransaction['result']> {
    const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    const connection = new Connection(rpc)
    const transaction = this.deserialize(params.transaction)
    this.sign(transaction)

    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      preflightCommitment: 'recent',
      ...params.options
    })

    return { signature }
  }

  public async signAllTransactions(
    params: SolanaLib.SignAllTransactions['params']
  ): Promise<SolanaLib.SignAllTransactions['result']> {
    const signedTransactions = params.transactions.map(transaction => {
      const transactionObj = this.deserialize(transaction)

      this.sign(transactionObj)

      return this.serialize(transactionObj)
    })

    return { transactions: signedTransactions }
  }

  private serialize(transaction: VersionedTransaction): string {
    return Buffer.from(transaction.serialize()).toString('base64')
  }

  private deserialize(transaction: string): VersionedTransaction {
    let bytes: Uint8Array
    try {
      bytes = bs58.decode(transaction)
    } catch {
      bytes = Buffer.from(transaction, 'base64')
    }

    return VersionedTransaction.deserialize(bytes)
  }

  private sign(transaction: VersionedTransaction) {
    transaction.sign([this.keypair])
  }
}

export namespace SolanaLib {
  type RPCRequest<Params, Result> = {
    params: Params
    result: Result
  }

  export type SignMessage = RPCRequest<{ message: string }, { signature: string }>

  export type SignTransaction = RPCRequest<
    { transaction: string },
    { transaction: string; signature: string }
  >

  export type SignAndSendTransaction = RPCRequest<
    { transaction: string; options?: SendOptions },
    { signature: string }
  >

  export type SignAllTransactions = RPCRequest<
    { transactions: string[] },
    { transactions: string[] }
  >
}
