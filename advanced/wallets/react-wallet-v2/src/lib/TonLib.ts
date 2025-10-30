import { KeyPair, keyPairFromSeed, keyPairFromSecretKey, sign, signVerify } from '@ton/crypto'
import {
  WalletContractV4,
  TonClient,
  internal,
  Address,
  Transaction,
  Cell,
  Message,
  address,
  beginCell,
  storeMessage
} from '@ton/ton'
import { TON_MAINNET_CHAINS, TON_TEST_CHAINS } from '@/data/TonData'

/**
 * Types
 */
interface IInitArguments {
  secretKey?: string
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

  public async getAddress() {
    return this.wallet.address.toString({ bounceable: false })
  }

  public getSecretKey() {
    return this.keypair.secretKey.toString('hex')
  }

  public async signMessage(
    params: TonLib.SignMessage['params']
  ): Promise<TonLib.SignMessage['result']> {
    const signature = sign(Buffer.from(params.message), this.keypair.secretKey)
    return {
      signature: signature.toString('base64'),
      publicKey: this.keypair.publicKey.toString('base64')
    }
  }

  public async sendMessage(
    params: TonLib.SendMessage['params'],
    chainId: string
  ): Promise<TonLib.SendMessage['result']> {
    const client = this.getTonClient(chainId)
    const walletContract = client.open(this.wallet)
    const seqno = await walletContract.getSeqno()
    const messages = (params.messages || []).map(m => {
      const amountBigInt = typeof m.amount === 'string' ? BigInt(m.amount) : BigInt(m.amount)
      return internal({
        to: Address.parse(m.address),
        value: amountBigInt,
        body: m.payload ?? 'Test transfer from ton WalletConnect'
      })
    })

    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: this.keypair.secretKey,
      messages
    })

    await walletContract.send(transfer)

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

  public async signData(params: TonLib.SignData['params']): Promise<TonLib.SignData['result']> {
    const payload: TonLib.SignData['params'] = params

    const dataToSign = this.getToSign(params)
    const signature = sign(dataToSign, this.keypair.secretKey as unknown as Buffer)
    const addressStr = await this.getAddress()

    const result = {
      signature: signature.toString('base64'),
      address: addressStr,
      publicKey: this.keypair.publicKey.toString('base64'),
      timestamp: Math.floor(Date.now() / 1000),
      domain:
        typeof window !== 'undefined' && window.location && window.location.hostname
          ? window.location.hostname
          : 'unknown',
      payload
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

  private getToSign(params: TonLib.SignData['params']): Buffer {
    if (params.type === 'text') {
      return Buffer.from(params.text)
    } else if (params.type === 'binary') {
      return Buffer.from(params.bytes)
    } else if (params.type === 'cell') {
      return Buffer.from(params.cell)
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

  export type SignMessage = RPCRequest<
    { message: string },
    { signature: string; publicKey: string }
  >

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
      publicKey: string
      timestamp: number
      domain: string
      payload: unknown
    }
  >
}
