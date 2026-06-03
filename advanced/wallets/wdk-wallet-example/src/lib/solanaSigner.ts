/**
 * Bridges WalletConnect's serialized Solana payloads onto the raw Ed25519 key
 * that WDK derives. WDK's high-level account API only accepts its own
 * transaction shape, so for the WalletConnect RPC methods (which send
 * base64/bs58-serialized `VersionedTransaction`s) we sign with the underlying
 * key directly via @solana/web3.js.
 */
import { Connection, Keypair, SendOptions, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { SOLANA_CHAINS } from '@/config/chains'

export interface SolanaSignMessage {
  message: string
}
export interface SolanaSignTransaction {
  transaction: string
}
export interface SolanaSignAndSendTransaction {
  transaction: string
  options?: SendOptions
}
export interface SolanaSignAllTransactions {
  transactions: string[]
}

export class SolanaSigner {
  private keypair: Keypair

  constructor(keypair: Keypair) {
    this.keypair = keypair
  }

  /** WDK exposes the 32-byte Ed25519 seed; web3.js derives the full key pair from it. */
  static fromSeed(seed: Uint8Array) {
    return new SolanaSigner(Keypair.fromSeed(Uint8Array.from(seed).slice(0, 32)))
  }

  signMessage({ message }: SolanaSignMessage) {
    const signature = nacl.sign.detached(bs58.decode(message), this.keypair.secretKey)
    return { signature: bs58.encode(signature) }
  }

  signTransaction({ transaction }: SolanaSignTransaction) {
    const tx = this.deserialize(transaction)
    tx.sign([this.keypair])
    return {
      transaction: this.serialize(tx),
      signature: bs58.encode(tx.signatures[0])
    }
  }

  async signAndSendTransaction({ transaction, options }: SolanaSignAndSendTransaction, caip2: string) {
    const rpc = SOLANA_CHAINS[caip2]?.rpc
    if (!rpc) throw new Error(`No RPC configured for ${caip2}`)

    const connection = new Connection(rpc, 'confirmed')
    const tx = this.deserialize(transaction)
    tx.sign([this.keypair])

    const signature = await connection.sendTransaction(tx, {
      maxRetries: 3,
      preflightCommitment: 'confirmed',
      ...options
    })
    return { signature }
  }

  signAllTransactions({ transactions }: SolanaSignAllTransactions) {
    return {
      transactions: transactions.map(serialized => {
        const tx = this.deserialize(serialized)
        tx.sign([this.keypair])
        return this.serialize(tx)
      })
    }
  }

  private serialize(tx: VersionedTransaction): string {
    return Buffer.from(tx.serialize()).toString('base64')
  }

  private deserialize(serialized: string): VersionedTransaction {
    let bytes: Uint8Array
    try {
      bytes = bs58.decode(serialized)
    } catch {
      bytes = new Uint8Array(Buffer.from(serialized, 'base64'))
    }
    return VersionedTransaction.deserialize(bytes)
  }
}
