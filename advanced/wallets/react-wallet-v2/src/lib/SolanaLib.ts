import {
  Keypair,
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SendOptions
} from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import SolanaWallet, { SolanaSignTransaction } from 'solana-wallet'
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

  public async signAndSendTransaction(
    feePayer: SolanaSignTransaction['feePayer'],
    instructions: SolanaSignTransaction['instructions'],
    chainId: string,
    options: SendOptions = {}
  ) {
    const rpc = { ...SOLANA_TEST_CHAINS, ...SOLANA_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    const connection = new Connection(rpc)

    const parsedInstructions = instructions.map(instruction => {
      const keys = instruction.keys.map(key => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable
      }))
      const programId = new PublicKey(instruction.programId)
      const data =
        typeof instruction.data === 'string'
          ? Buffer.from(bs58.decode(instruction.data).buffer)
          : instruction.data

      return new TransactionInstruction({
        keys,
        programId,
        data
      })
    })

    const transaction = new Transaction().add(...parsedInstructions)
    transaction.feePayer = new PublicKey(feePayer)
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    transaction.sign(this.keypair)

    const signature = await connection.sendRawTransaction(transaction.serialize())
    const confirmation = await connection.confirmTransaction(signature, options.preflightCommitment)

    if (confirmation.value.err) {
      throw new Error(confirmation.value.err.toString())
    }

    return { signature }
  }
}
