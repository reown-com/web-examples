import { TXRPLChain, XRPL_CHAINS } from '@/data/XRPLData'
import { Client, Transaction, Wallet, decode, deriveKeypair } from 'xrpl'
const multisign = require('xrpl-sign-keypairs')

/**
 * Types
 */
interface IInitArguments {
  seed?: string
}

interface SignTransactionParams {
  chainId: string
  tx_json: Transaction
  autofill?: boolean
  submit?: boolean
}

interface SignTransactionForParams {
  chainId: string
  tx_signer: string
  tx_json: Transaction
  autofill?: boolean
  submit?: boolean
}

/**
 * Library
 */
export default class XrplLib {
  private wallet: Wallet

  constructor(wallet: Wallet) {
    this.wallet = wallet
  }

  static init({ seed }: IInitArguments) {
    let wallet: Wallet
    if (seed) {
      wallet = Wallet.fromSeed(seed)
    } else {
      wallet = Wallet.generate()
    }
    return new XrplLib(wallet)
  }

  public get seed() {
    return this.wallet.seed!
  }

  public getAddress() {
    return this.wallet.address
  }

  public async signTransaction({
    chainId,
    tx_json,
    autofill = true,
    submit = true
  }: SignTransactionParams) {
    const client = new Client(XRPL_CHAINS[chainId as TXRPLChain].rpc)
    await client.connect()

    if (autofill) {
      tx_json = await client.autofill(tx_json)
    }
    const { tx_blob, hash } = this.wallet.sign(tx_json)
    if (submit) {
      await client.submitAndWait(tx_blob)
    }
    return { ...decode(tx_blob), hash }
  }

  public async signTransactionFor({
    chainId,
    tx_signer,
    tx_json,
    autofill = false,
    submit = false
  }: SignTransactionForParams) {
    const client = new Client(XRPL_CHAINS[chainId as TXRPLChain].rpc)
    await client.connect()

    if (autofill) {
      tx_json = await client.autofill(tx_json)
    }

    const { txJson, id: hash } = multisign(
      JSON.stringify(tx_json),
      deriveKeypair(this.wallet.seed!),
      { signAs: tx_signer }
    )
    tx_json = txJson

    if (submit) {
      await client.submitAndWait(tx_json)
    }
    return { ...tx_json, hash }
  }
}
