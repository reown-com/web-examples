import { KeyPair, keyPairFromSeed, keyPairFromSecretKey, sign, signVerify } from '@ton/crypto'
import {
  WalletContractV4,
  TonClient,
  internal,
  Address,
  Cell,
  Message,
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

      if (params.valid_until < Date.now() / 1000) {
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
      // TODO: should include validation for sufficient amount

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

  public async sendMessage(
    params: TonLib.SendMessage['params'],
    chainId: string
  ): Promise<TonLib.SendMessage['result']> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await retry(() => walletContract.getSeqno())

    this.validateSendMessage(params)

    const messages = (params.messages || []).map(m => {
      const amountBigInt = typeof m.amount === 'string' ? BigInt(m.amount) : BigInt(m.amount)
      return internal({
        to: Address.parse(m.address),
        bounce: Address.parseFriendly(m.address).isBounceable,
        value: amountBigInt,
        body: m.payload ? Cell.fromBase64(m.payload) : 'Test transfer from ton WalletConnect',
        init: m.stateInit ? loadStateInit(Cell.fromBase64(m.stateInit).beginParse()) : undefined
      })
    })

    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages,
      timeout: params.valid_until
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

  private createTonProofMessageBytes(message: {
    address: Address
    timestamp: number
    domain: {
      lengthBytes: number
      value: string
    }
    payload: string
  }): Buffer {
    const innerMessage = {
      workchain: message.address.workChain,
      address: message.address.hash,
      domain: message.domain,
      payload: message.payload,
      timestamp: message.timestamp
    }

    const wc = Buffer.alloc(4)
    wc.writeUInt32BE(message.address.workChain)

    const ts = Buffer.alloc(8)
    ts.writeBigUInt64LE(BigInt(message.timestamp))

    const dl = Buffer.alloc(4)
    dl.writeUInt32LE(message.domain.lengthBytes)

    const m = Buffer.concat([
      Buffer.from(this.tonProofPrefix),
      wc,
      message.address.hash,
      dl,
      Buffer.from(message.domain.value),
      ts,
      Buffer.from(message.payload)
    ])

    const messageHash = sha256(m)

    const fullMes = Buffer.concat([
      Buffer.from([0xff, 0xff]),
      Buffer.from(this.tonConnectPrefix),
      messageHash
    ])
    const res = sha256(fullMes)

    return Buffer.from(res)
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

    const signature = sign(dataToSign, this.keypair.secretKey)

    return {
      signature: signature.toString('base64'),
      publicKey: this.getPublicKey()
    }
  }

  /**
   * Creates hash for Cell payload according to TON Connect specification.
   */
  /**
   * Creates hash for text or binary payload.
   * Message format:
   * message = 0xffff || "ton-connect/sign-data/" || workchain || address_hash || domain_len || domain || timestamp || payload
   */
  private createTextBinaryHash(
    payload: TonLib.SignData['params'] & { type: 'text' | 'binary' },
    parsedAddr: Address,
    domain: string,
    timestamp: number
  ): Buffer {
    // Create workchain buffer
    const wcBuffer = Buffer.alloc(4)
    wcBuffer.writeInt32BE(parsedAddr.workChain)

    // Create domain buffer
    const domainBuffer = Buffer.from(domain, 'utf8')
    const domainLenBuffer = Buffer.alloc(4)
    domainLenBuffer.writeUInt32BE(domainBuffer.length)

    // Create timestamp buffer
    const tsBuffer = Buffer.alloc(8)
    tsBuffer.writeBigUInt64BE(BigInt(timestamp))

    // Create payload buffer
    const typePrefix = payload.type === 'text' ? 'txt' : 'bin'
    const content = payload.type === 'text' ? payload.text : payload.bytes
    const encoding = payload.type === 'text' ? 'utf8' : 'base64'

    const payloadPrefix = Buffer.from(typePrefix)
    const payloadBuffer = Buffer.from(content, encoding)
    const payloadLenBuffer = Buffer.alloc(4)
    payloadLenBuffer.writeUInt32BE(payloadBuffer.length)

    // Build message
    const message = Buffer.concat([
      Buffer.from([0xff, 0xff]),
      Buffer.from('ton-connect/sign-data/'),
      wcBuffer,
      parsedAddr.hash,
      domainLenBuffer,
      domainBuffer,
      tsBuffer,
      payloadPrefix,
      payloadLenBuffer,
      payloadBuffer
    ])

    // Hash message with sha256
    const hash = sha256(message)
    return Buffer.from(hash)
  }

  /**
   * Creates hash for Cell payload according to TON Connect specification.
   */
  private createCellHash(
    payload: TonLib.SignData['params'] & { type: 'cell' },
    parsedAddr: Address,
    domain: string,
    timestamp: number
  ): Buffer {
    const cell = Cell.fromBase64(payload.cell)
    const schemaHash = crc32.buf(Buffer.from(payload.schema, 'utf8')) >>> 0 // unsigned crc32 hash

    // Encode domain in DNS-like format (e.g. "example.com" -> "com\0example\0")
    const encodedDomain = this.encodeDomainDnsLike(domain)

    const message = beginCell()
      .storeUint(0x75569022, 32) // prefix
      .storeUint(schemaHash, 32) // schema hash
      .storeUint(timestamp, 64) // timestamp
      .storeAddress(parsedAddr) // user wallet address
      .storeStringRefTail(encodedDomain.toString('utf8')) // app domain (DNS-like encoded, snake stored)
      .storeRef(cell) // payload cell
      .endCell()

    return Buffer.from(message.hash())
  }

  private encodeDomainDnsLike(domain: string): Buffer {
    const parts = domain.split('.').reverse() // reverse for DNS-like encoding
    const encoded: number[] = []

    for (const part of parts) {
      // Add the part characters
      for (let i = 0; i < part.length; i++) {
        encoded.push(part.charCodeAt(i))
      }
      encoded.push(0) // null byte after each part
    }

    return Buffer.from(encoded)
  }

  public async signData(
    params: TonLib.SignData['params'],
    domain: string,
    chainId: string
  ): Promise<TonLib.SignData['result']> {
    const payload: TonLib.SignData['params'] = params

    const timestamp = Math.floor(Date.now() / 1000)

    const dataToSign = this.getToSign(params, this.wallet.address, domain, timestamp)

    const signature = sign(dataToSign, this.keypair.secretKey)
    const addressStr = await this.getAddressRaw()

    const result = {
      signature: signature.toString('base64'),
      address: addressStr,
      publicKey: this.getPublicKey(),
      timestamp,
      domain,
      payload: { ...payload, network: chainId.split(":")[1] }
    }

    try {
      const verified = signVerify(
        dataToSign,
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
  ): Buffer {
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
