import { KeyPair, keyPairFromSeed, keyPairFromSecretKey, sign, signVerify } from '@ton/crypto'
import {
  WalletContractV4,
  TonClient,
  internal,
  Address,
  Cell,
  Message,
  SendMode,
  beginCell,
  storeMessage,
  storeStateInit,
  loadStateInit
} from '@ton/ton'
import { TON_MAINNET_CHAINS, TON_TEST_CHAINS } from '@/data/TonData'
import { sha256 } from '@noble/hashes/sha2'
import { Buffer } from 'buffer'
import crc32 from 'crc-32'

export async function retry<T>(
  fn: () => Promise<T>,
  { retries = 3, delay = 1200 }: { retries?: number; delay?: number } = {}
): Promise<T> {
  let lastError: Error | undefined
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (e instanceof Error) {
        lastError = e
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError ?? new Error('Retry attempts exhausted')
}

/**
 * Types
 */
interface IInitArguments {
  secretKey?: string
  seed?: string
}

export class TonValidationError extends Error {
  constructor(message: string) {
    super(`TonValidationError: ${message}`)
  }
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
      keypair = keyPairFromSecretKey(Buffer.from(secretKey, 'hex'))
    } else if (seed) {
      keypair = keyPairFromSeed(Buffer.from(seed, 'hex'))
    } else {
      // Generate random keypair using crypto.getRandomValues
      const seed = crypto.getRandomValues(new Uint8Array(32))
      keypair = keyPairFromSeed(Buffer.from(seed))
    }

    return new TonLib(keypair)
  }

  public async getAddressRaw() {
    return this.wallet.address.toRawString()
  }

  public async getAddress() {
    return this.wallet.address.toString({ bounceable: false })
  }

  public getStateInit() {
    return beginCell().store(storeStateInit(this.wallet.init)).endCell().toBoc().toString('base64')
  }

  public getPublicKey() {
    return this.keypair.publicKey.toString('hex')
  }

  public getSecretKey() {
    return this.keypair.secretKey.toString('hex')
  }

  public validateSendMessage(params: unknown) {
    if (typeof params !== 'object' || params === null) {
      throw new TonValidationError('Invalid params')
    }

    if ('from' in params) {
      if (typeof params.from !== 'string') {
        throw new TonValidationError('From must be a string.')
      }
      let from: Address
      try {
        from = Address.parse(params.from)
      } catch (e) {
        throw new TonValidationError('Invalid from address.')
      }
      if (!this.wallet.address.equals(from)) {
        throw new TonValidationError('From address does not match.')
      }
    }

    if ('valid_until' in params) {
      if (typeof params.valid_until !== 'number') {
        throw new TonValidationError('Valid until must be a number.')
      }

      const validUntilSeconds = this.normalizeValidUntil(params.valid_until)

      if (validUntilSeconds! < Math.floor(Date.now() / 1000)) {
        throw new TonValidationError('Message is expired.')
      }
    }

    if (!('messages' in params)) {
      throw new TonValidationError('Messages are absent.')
    }

    if (!Array.isArray(params.messages)) {
      throw new TonValidationError('Messages must be an array.')
    }

    if (params.messages.length === 0) {
      throw new TonValidationError('Messages are empty.')
    }

    for (const message of params.messages as unknown[]) {
      if (typeof message !== 'object' || message === null) {
        throw new TonValidationError('Messages must be an object.')
      }

      if (!('address' in message)) {
        throw new TonValidationError('Address is absent.')
      }
      if (typeof message.address !== 'string') {
        throw new TonValidationError('Address must be a string.')
      }

      if (Address.isRaw(message.address)) {
        throw new TonValidationError('Address is in HEX format.')
      }
      if (!Address.isFriendly(message.address)) {
        throw new TonValidationError('Address is invalid.')
      }
      if (!('amount' in message)) {
        throw new TonValidationError('Amount is absent.')
      }
      if (typeof message.amount === 'number') {
        throw new TonValidationError('Amount is a number.')
      }
      if (typeof message.amount !== 'string') {
        throw new TonValidationError('Amount is invalid.')
      }

      try {
        BigInt(message.amount)
      } catch (e) {
        throw new TonValidationError('Amount is invalid.')
      }

      if ('payload' in message) {
        if (typeof message.payload !== 'string') {
          throw new TonValidationError('Payload is invalid.')
        }
        try {
          Cell.fromBase64(message.payload)
        } catch (e) {
          throw new TonValidationError('Payload is invalid.')
        }
      }

      if ('stateInit' in message) {
        if (typeof message.stateInit !== 'string') {
          throw new TonValidationError('StateInit is invalid.')
        }

        try {
          Cell.fromBase64(message.stateInit)
        } catch (e) {
          throw new TonValidationError('StateInit is invalid.')
        }
      }
    }
  }

  /**
   * Normalizes valid_until to seconds if it appears to be in milliseconds.
   * TON uses 32-bit timestamps (seconds), but some dApps send milliseconds.
   */
  private normalizeValidUntil(validUntil?: number): number | undefined {
    if (validUntil === undefined) {
      return undefined
    }
    // If value > 10 billion, it's likely milliseconds (year 2286+ in seconds)
    if (validUntil > 10_000_000_000) {
      return Math.floor(validUntil / 1000)
    }
    return validUntil
  }

  private parseTonMessages(params: TonLib.SendMessage['params']) {
    this.validateSendMessage(params)
    return params.messages.map(m => {
      const amountBigInt = typeof m.amount === 'string' ? BigInt(m.amount) : BigInt(m.amount)
      return internal({
        to: Address.parse(m.address),
        bounce: Address.parseFriendly(m.address).isBounceable,
        value: amountBigInt,
        body: m.payload ? Cell.fromBase64(m.payload) : 'Test transfer from ton WalletConnect',
        init: m.stateInit ? loadStateInit(Cell.fromBase64(m.stateInit).beginParse()) : undefined
      })
    })
  }

  public async sendMessage(
    params: TonLib.SendMessage['params'],
    chainId: string
  ): Promise<TonLib.SendMessage['result']> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await retry(() => walletContract.getSeqno())

    const messages = this.parseTonMessages(params)

    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages,
      sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
      timeout: this.normalizeValidUntil(params.valid_until)
    })

    await retry(() => walletContract.send(transfer))

    // Build external-in message for the result
    const message: Message = {
      info: {
        type: 'external-in',
        src: null,
        dest: Address.parse(this.wallet.address.toString()),
        importFee: BigInt(0)
      },
      init: null,
      body: transfer
    }

    const externalMessageCell = beginCell()
      .store(storeMessage(message, { forceRef: true }))
      .endCell()

    return externalMessageCell.toBoc().toString('base64')
  }

  private readonly tonProofPrefix = 'ton-proof-item-v2/'
  private readonly tonConnectPrefix = 'ton-connect'

  private static encoder = new TextEncoder()

  private static concatBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const arr of arrays) {
      result.set(arr, offset)
      offset += arr.length
    }
    return result
  }

  private static writeUint32BE(value: number): Uint8Array {
    const buf = new Uint8Array(4)
    new DataView(buf.buffer).setUint32(0, value, false)
    return buf
  }

  private static writeUint32LE(value: number): Uint8Array {
    const buf = new Uint8Array(4)
    new DataView(buf.buffer).setUint32(0, value, true)
    return buf
  }

  private static writeInt32BE(value: number): Uint8Array {
    const buf = new Uint8Array(4)
    new DataView(buf.buffer).setInt32(0, value, false)
    return buf
  }

  private static writeBigUint64LE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    new DataView(buf.buffer).setBigUint64(0, value, true)
    return buf
  }

  private static writeBigUint64BE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    new DataView(buf.buffer).setBigUint64(0, value, false)
    return buf
  }

  private createTonProofMessageBytes(message: {
    address: Address
    timestamp: number
    domain: {
      lengthBytes: number
      value: string
    }
    payload: string
  }): Uint8Array {
    const { encoder, concatBytes, writeUint32BE, writeUint32LE, writeBigUint64LE } = TonLib

    const wc = writeUint32BE(message.address.workChain)
    const ts = writeBigUint64LE(BigInt(message.timestamp))
    const dl = writeUint32LE(message.domain.lengthBytes)

    const m = concatBytes(
      encoder.encode(this.tonProofPrefix),
      wc,
      new Uint8Array(message.address.hash),
      dl,
      encoder.encode(message.domain.value),
      ts,
      encoder.encode(message.payload)
    )

    const messageHash = sha256(m)

    const fullMes = concatBytes(
      new Uint8Array([0xff, 0xff]),
      encoder.encode(this.tonConnectPrefix),
      messageHash
    )

    return sha256(fullMes)
  }

  public async generateTonProof(
    params: TonLib.TonProof['params']
  ): Promise<TonLib.TonProof['result']> {
    const domain = params.domain

    const dataToSign = this.createTonProofMessageBytes({
      address: this.wallet.address,
      domain: {
        lengthBytes: domain.length,
        value: params.domain
      },
      payload: params.payload,
      timestamp: Math.floor(new Date(params.iat).getTime() / 1000)
    })

    const signature = sign(Buffer.from(dataToSign), this.keypair.secretKey)

    return {
      signature: signature.toString('base64'),
      publicKey: this.getPublicKey()
    }
  }

  private createTextBinaryHash(
    payload: TonLib.SignData['params'] & { type: 'text' | 'binary' },
    parsedAddr: Address,
    domain: string,
    timestamp: number
  ): Uint8Array {
    const { encoder, concatBytes, writeInt32BE, writeUint32BE, writeBigUint64BE } = TonLib

    const wcBuffer = writeInt32BE(parsedAddr.workChain)
    const domainBytes = encoder.encode(domain)
    const domainLenBuffer = writeUint32BE(domainBytes.length)
    const tsBuffer = writeBigUint64BE(BigInt(timestamp))

    const content = payload.type === 'text' ? payload.text : payload.bytes
    const payloadPrefix = encoder.encode(payload.type === 'text' ? 'txt' : 'bin')
    const payloadBytes =
      payload.type === 'text'
        ? encoder.encode(content)
        : Uint8Array.from(atob(content), c => c.charCodeAt(0))
    const payloadLenBuffer = writeUint32BE(payloadBytes.length)

    const message = concatBytes(
      new Uint8Array([0xff, 0xff]),
      encoder.encode('ton-connect/sign-data/'),
      wcBuffer,
      new Uint8Array(parsedAddr.hash),
      domainLenBuffer,
      domainBytes,
      tsBuffer,
      payloadPrefix,
      payloadLenBuffer,
      payloadBytes
    )

    return sha256(message)
  }

  private createCellHash(
    payload: TonLib.SignData['params'] & { type: 'cell' },
    parsedAddr: Address,
    domain: string,
    timestamp: number
  ): Uint8Array {
    const cell = Cell.fromBase64(payload.cell)
    const schemaHash = crc32.buf(TonLib.encoder.encode(payload.schema)) >>> 0

    const encodedDomain = this.encodeDomainDnsLike(domain)

    const message = beginCell()
      .storeUint(0x75569022, 32)
      .storeUint(schemaHash, 32)
      .storeUint(timestamp, 64)
      .storeAddress(parsedAddr)
      .storeStringRefTail(new TextDecoder().decode(encodedDomain))
      .storeRef(cell)
      .endCell()

    return new Uint8Array(message.hash())
  }

  private encodeDomainDnsLike(domain: string): Uint8Array {
    const parts = domain.split('.').reverse()
    const encoded: number[] = []

    for (const part of parts) {
      for (let i = 0; i < part.length; i++) {
        encoded.push(part.charCodeAt(i))
      }
      encoded.push(0)
    }

    return new Uint8Array(encoded)
  }

  public async signData(
    params: TonLib.SignData['params'],
    domain: string,
    chainId: string
  ): Promise<TonLib.SignData['result']> {
    const payload: TonLib.SignData['params'] = params

    const timestamp = Math.floor(Date.now() / 1000)

    const dataToSign = this.getToSign(params, this.wallet.address, domain, timestamp)
    const dataBuffer = Buffer.from(dataToSign)

    const signature = sign(dataBuffer, this.keypair.secretKey)
    const addressStr = await this.getAddressRaw()

    const result = {
      signature: signature.toString('base64'),
      address: addressStr,
      publicKey: this.getPublicKey(),
      timestamp,
      domain,
      payload: { ...payload, network: chainId.split(':')[1] }
    }

    try {
      const verified = signVerify(
        dataBuffer,
        Buffer.from(result.signature, 'base64'),
        this.keypair.publicKey
      )
      console.log('TON signData verified:', verified)
    } catch (e) {
      console.warn('TON signData verification failed to run', e)
    }

    return result
  }

  private getTonClient(chainId: string): TonClient {
    const rpc = { ...TON_TEST_CHAINS, ...TON_MAINNET_CHAINS }[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    return new TonClient({
      endpoint: rpc,
      apiKey: process.env.NEXT_PUBLIC_TON_CENTER_API_KEY
    })
  }

  private getToSign(
    params: TonLib.SignData['params'],
    address: Address,
    domain: string,
    timestamp: number
  ): Uint8Array {
    if (params.type === 'text' || params.type === 'binary') {
      return this.createTextBinaryHash(params, address, domain, timestamp)
    } else if (params.type === 'cell') {
      return this.createCellHash(params, address, domain, timestamp)
    } else {
      throw new Error('Unsupported sign data type')
    }
  }
}

export namespace TonLib {
  type RPCRequest<Params, Result> = {
    params: Params
    result: Result
  }

  export type TonProof = RPCRequest<
    { iat: string; domain: string; payload: string },
    {
      signature: string
      publicKey: string
    }
  >

  export type SendMessage = RPCRequest<
    {
      valid_until?: number
      from?: string
      messages: Array<{
        address: string
        amount: string
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
      publicKey: string
      timestamp: number
      domain: string
      payload: unknown
    }
  >
}
