import { KeyPair, keyPairFromSeed, keyPairFromSecretKey, sign } from '@ton/crypto'
import { ed25519 } from '@noble/curves/ed25519'
import { Cell } from '@ton/core'
import { WalletContractV4, TonClient, internal, Address } from '@ton/ton'
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
      keypair = keyPairFromSecretKey(Buffer.from(secretKey))
    } else if (seed) {
      keypair = keyPairFromSeed(Buffer.from(seed, 'hex'))
    } else {
      // Generate random keypair using crypto.getRandomValues
      const secretKey = new Uint8Array(64)
      crypto.getRandomValues(secretKey)
      keypair = keyPairFromSecretKey(Buffer.from(secretKey))
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
    const signature = sign(
      messageBytes as unknown as Buffer,
      this.keypair.secretKey as unknown as Buffer
    )

    return { signature: Buffer.from(signature as unknown as Uint8Array).toString('hex') }
  }

  public async sendMessage(
    params: TonLib.SendMessage['params'],
    chainId: string
  ): Promise<TonLib.SendMessage['result']> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await walletContract.getSeqno()

    const messages = (params.messages || []).map(m => {
      const bodyCell = m.payload ? Cell.fromBoc(Buffer.from(m.payload, 'base64'))[0] : undefined
      const amountBigInt = typeof m.amount === 'string' ? BigInt(m.amount) : BigInt(m.amount)
      // NOTE: stateInit handling omitted in this example implementation
      return internal({
        to: Address.parse(m.address),
        value: amountBigInt,
        body: bodyCell
      })
    })

    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages
    })

    await walletContract.sendTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages
    })

    return transfer.toBoc().toString('base64')
  }

  public async signData(params: TonLib.SignData['params']): Promise<TonLib.SignData['result']> {
    let bytes: Uint8Array
    const payload: TonLib.SignData['params'] = params
    if (params.type === 'text') {
      bytes = new TextEncoder().encode(params.text)
    } else if (params.type === 'binary') {
      bytes = base64ToBytes(params.bytes)
    } else if (params.type === 'cell') {
      bytes = base64ToBytes(params.cell)
    } else {
      throw new Error('Unsupported sign data type')
    }

    const signature = sign(bytes as unknown as Buffer, this.keypair.secretKey as unknown as Buffer)
    const addressStr = this.wallet.address.toString()

    const result = {
      signature: bytesToBase64(signature as unknown as Uint8Array),
      address: addressStr,
      timestamp: Math.floor(Date.now() / 1000),
      domain:
        typeof window !== 'undefined' && window.location && window.location.hostname
          ? window.location.hostname
          : 'unknown',
      payload
    }
    // inline self-verification (for demo parity with Sui)
    try {
      const verified = ed25519.verify(
        base64ToBytes(result.signature),
        bytes,
        new Uint8Array(this.keypair.publicKey)
      )
      console.log('TON signData verified:', verified)
    } catch (e) {
      console.warn('TON signData verification failed to run', e)
    }
    return result
  }

  public verifyDataSignature(params: TonLib.SignData['params'], signatureBase64: string): boolean {
    let bytes: Uint8Array
    if (params.type === 'text') {
      bytes = new TextEncoder().encode(params.text)
    } else if (params.type === 'binary') {
      bytes = base64ToBytes(params.bytes)
    } else if (params.type === 'cell') {
      bytes = base64ToBytes(params.cell)
    } else {
      throw new Error('Unsupported sign data type')
    }
    const sig = base64ToBytes(signatureBase64)
    return ed25519.verify(sig, bytes, new Uint8Array(this.keypair.publicKey))
  }

  // no signAllTransactions in TON spec

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
      body: undefined // No additional body for simple transfers
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

  export type SendMessage = RPCRequest<
    {
      valid_until?: number
      from?: string
      messages: Array<{
        address: string
        amount: number | string
        payload?: string
        stateInit?: string
        extra_currency?: Record<string, string | number>
      }>
    },
    string
  >

  export type SignData = RPCRequest<
    | { type: 'text'; text: string; from?: string }
    | { type: 'binary'; bytes: string; from?: string }
    | { type: 'cell'; schema: string; cell: string; from?: string },
    {
      signature: string
      address: string
      timestamp: number
      domain: string
      payload: unknown
    }
  >
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  // Fallback for non-browser environments
  const nodeBuffer: any = require('buffer').Buffer
  const buf = nodeBuffer.from(b64, 'base64')
  return new Uint8Array(buf)
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk) as any)
    }
    return window.btoa(binary)
  }
  // Fallback for non-browser environments
  const nodeBuffer: any = require('buffer').Buffer
  return nodeBuffer.from(bytes).toString('base64')
}
