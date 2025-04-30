import {
  Keypair,
  Connection,
  SendOptions,
  VersionedTransaction,
  PublicKey,
  Transaction,
  SystemProgram
} from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount
} from '@solana/spl-token'
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
      // Convert base64 to Uint8Array to avoid type issues
      const buffer = Buffer.from(transaction, 'base64')
      bytes = new Uint8Array(buffer)
    }

    return VersionedTransaction.deserialize(bytes)
  }

  private sign(transaction: VersionedTransaction) {
    transaction.sign([this.keypair])
  }

  /**
   * Send SOL to a recipient
   * @param recipientAddress The recipient's address
   * @param amount The amount to send in lamports (as a bigint)
   * @returns The transaction signature/hash
   */
  public async sendSol(recipientAddress: string, chainId: string, amount: bigint): Promise<string> {
    console.log({ chainId })
    const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    const connection = new Connection(rpc, 'confirmed')
    const fromPubkey = this.keypair.publicKey
    const toPubkey = new PublicKey(recipientAddress)

    // Create a simple SOL transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: amount
      })
    )

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPubkey

    // Sign the transaction
    transaction.sign(this.keypair)

    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize())

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')

    return signature
  }

  /**
   * Send an SPL token to a recipient
   * @param tokenAddress The token's mint address
   * @param recipientAddress The recipient's address
   * @param amount The amount to send (as a bigint)
   * @returns The transaction signature/hash
   */
  public async sendSplToken(
    tokenAddress: string,
    recipientAddress: string,
    chainId: string,
    amount: bigint
  ): Promise<string> {
    const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    const connection = new Connection(rpc, 'confirmed')
    const fromWallet = this.keypair
    const fromPubkey = fromWallet.publicKey
    const toPubkey = new PublicKey(recipientAddress)
    const mint = new PublicKey(tokenAddress)

    // Get sender's token account (create if it doesn't exist)
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromWallet,
      mint,
      fromPubkey
    )

    // Check if recipient has a token account WITHOUT creating one
    const associatedTokenAddress = await getAssociatedTokenAddress(mint, toPubkey)

    const recipientTokenAccount = await connection.getAccountInfo(associatedTokenAddress)

    if (!recipientTokenAccount) {
      throw new Error(
        `Recipient ${recipientAddress} doesn't have a token account for this SPL token. Transaction cannot proceed.`
      )
    }

    // Create transfer instruction to existing account
    const transferInstruction = createTransferInstruction(
      fromTokenAccount.address,
      associatedTokenAddress,
      fromPubkey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )

    // Create transaction and add the transfer instruction
    const transaction = new Transaction().add(transferInstruction)

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromPubkey

    // Sign the transaction
    transaction.sign(fromWallet)

    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize())

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')

    return signature
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
