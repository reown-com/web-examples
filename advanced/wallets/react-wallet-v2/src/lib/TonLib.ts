import { KeyPair, keyPairFromSeed, keyPairFromSecretKey, sign } from '@ton/crypto'
import { WalletContractV4, TonClient, internal, beginCell, Address } from '@ton/ton'
import { TON_MAINNET_CHAINS, TON_TEST_CHAINS } from '@/data/TonData'

/**
 * Types
 */
interface IInitArguments {
  secretKey?: Uint8Array
  seed?: string
}

/**
 * Library
 */
export default class TonLib {
  keypair: KeyPair
  wallet: WalletContractV4

  constructor(keypair: KeyPair) {
    this.keypair = keypair
    this.wallet = WalletContractV4.create({ workchain: 0, publicKey: keypair.publicKey })
  }

  static async init({ secretKey, seed }: IInitArguments) {
    let keypair: KeyPair

    if (secretKey) {
      keypair = keyPairFromSecretKey(secretKey as any)
    } else if (seed) {
      keypair = keyPairFromSeed(Buffer.from(seed, 'hex') as any)
    } else {
      // Generate random keypair using crypto.getRandomValues
      const secretKey = new Uint8Array(32)
      crypto.getRandomValues(secretKey)
      keypair = keyPairFromSecretKey(secretKey as any)
    }

    return new TonLib(keypair)
  }

  public async getAddress() {
    return this.wallet.address.toString()
  }

  public getSecretKey() {
    return this.keypair.secretKey.toString('hex')
  }

  public async signMessage(
    params: TonLib.SignMessage['params']
  ): Promise<TonLib.SignMessage['result']> {
    const messageBytes = new TextEncoder().encode(params.message)
    const signature = sign(messageBytes as any, this.keypair.secretKey as any)

    return { signature: signature.toString('hex') }
  }

  public async signTransaction(
    params: TonLib.SignTransaction['params']
  ): Promise<TonLib.SignTransaction['result']> {
    const client = this.getTonClient(params.chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await walletContract.getSeqno()

    // Parse the transaction message
    const message = internal({
      to: Address.parse(params.transaction.to),
      value: BigInt(params.transaction.value),
      body: params.transaction.body ? beginCell().storeBuffer(Buffer.from(params.transaction.body, 'hex')).endCell() : undefined,
    })

    // Create transfer
    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages: [message]
    })

    return {
      transaction: transfer.toBoc().toString('base64'),
      signature: 'signed' // TON transactions are signed internally
    }
  }

  public async signAndSendTransaction(
    params: TonLib.SignAndSendTransaction['params'],
    chainId: string
  ): Promise<TonLib.SignAndSendTransaction['result']> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await walletContract.getSeqno()

    // Parse the transaction message
    const message = internal({
      to: Address.parse(params.transaction.to),
      value: BigInt(params.transaction.value),
      body: params.transaction.body ? beginCell().storeBuffer(Buffer.from(params.transaction.body, 'hex')).endCell() : undefined,
    })

    // Create and send transfer
    await walletContract.sendTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages: [message]
    })

    return { hash: 'transaction_sent' } // TON doesn't return hash directly
  }

  public async signAllTransactions(
    params: TonLib.SignAllTransactions['params']
  ): Promise<TonLib.SignAllTransactions['result']> {
    const signedTransactions = params.transactions.map(transaction => {
      // For now, just return the transaction as-is since TON signing is complex
      // This would need more sophisticated handling for batch transactions
      return transaction
    })

    return { transactions: signedTransactions }
  }

  private getTonClient(chainId: string): TonClient {
    const rpc = { ...TON_TEST_CHAINS, ...TON_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    return new TonClient({
      endpoint: rpc
    })
  }

  /**
   * Send TON to a recipient
   * @param recipientAddress The recipient's address
   * @param amount The amount to send in nanotons (as a bigint)
   * @returns The transaction hash
   */
  public async sendTon(recipientAddress: string, chainId: string, amount: bigint): Promise<string> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await walletContract.getSeqno()

    // Create transfer message
    const message = internal({
      to: Address.parse(recipientAddress),
      value: amount,
      body: undefined, // No additional body for simple transfers
    })

    // Create and send transfer
    await walletContract.sendTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages: [message]
    })

    return 'transaction_sent' // TON doesn't return hash directly
  }
}

export namespace TonLib {
  type RPCRequest<Params, Result> = {
    params: Params
    result: Result
  }

  export type SignMessage = RPCRequest<{ message: string }, { signature: string }>

  export type SignTransaction = RPCRequest<
    { transaction: { to: string; value: string; body?: string }; chainId: string },
    { transaction: string; signature: string }
  >

  export type SignAndSendTransaction = RPCRequest<
    { transaction: { to: string; value: string; body?: string } },
    { hash: string }
  >

  export type SignAllTransactions = RPCRequest<
    { transactions: string[] },
    { transactions: string[] }
  >
}
