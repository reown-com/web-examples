import { TronWeb, utils } from 'tronweb'
import { TRON_MAINNET_CHAINS } from '@/data/TronData'

/**
 * Types
 */
interface IInitArguments {
  privateKey: string
}

/**
 * The `tron_signTransaction` payload WC Pay hands the wallet. `raw_data_hex` is the
 * canonical payload and `txID` is `sha256(raw_data_hex)`, which WC Pay has already
 * committed to.
 */
export interface TronUnsignedTransaction {
  txID: string
  raw_data_hex: string
  raw_data?: Record<string, any>
  visible?: boolean
}

/**
 * What the wallet hands back at `confirm`: the exact bytes it signed, plus exactly
 * one 65-byte recoverable signature.
 */
export interface TronSignedTransaction {
  raw_data_hex: string
  signature: string[]
}

const TRON_MAINNET_FULL_NODE = Object.values(TRON_MAINNET_CHAINS)[0].fullNode

/**
 * TronWeb's hex parser rejects any non-hex character, so a `0x`-prefixed key fails
 * with an opaque "Invalid private key provided". Keys reach us both ways —
 * `utils.accounts.generateAccount()` returns them unprefixed, `TronWeb.fromMnemonic()`
 * passes through ethers' `0x`-prefixed value — so normalize on the way in.
 */
function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/^0x/, '')
}

/**
 * Library
 */
export default class TronLib {
  privateKey: string
  tronWeb: TronWeb

  constructor(privateKey: string) {
    this.privateKey = normalizePrivateKey(privateKey)
    this.tronWeb = new TronWeb({
      // Mainnet, since that is the network WalletConnect Pay settles on. Session
      // requests re-point the node per chain id via `setFullNode`.
      fullHost: TRON_MAINNET_FULL_NODE,
      privateKey: this.privateKey
    })
  }

  static async init({ privateKey }: IInitArguments) {
    if (!privateKey) {
      const account = utils.accounts.generateAccount()
      return new TronLib(account.privateKey)
    } else {
      return new TronLib(privateKey)
    }
  }

  public getAddress() {
    return this.tronWeb.defaultAddress.base58
  }

  public createAccount() {
    return this.tronWeb.createAccount()
  }

  public setFullNode(node: string) {
    return this.tronWeb.setFullNode(node)
  }

  public async signMessage(message: string) {
    const signedtxn = await this.tronWeb.trx.signMessageV2(message)
    return signedtxn
  }

  public async signTransaction(transaction: any) {
    const signedtxn = await this.tronWeb.trx.sign(transaction)
    return signedtxn
  }

  public async sendTransaction(signedTransaction: any) {
    const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction)
    return {
      result: result.result ?? false,
      txid: result.txid ?? signedTransaction.txID
    }
  }

  /**
   * Signs a WalletConnect Pay `tron_signTransaction` action.
   *
   * Tron is a sign-only relay family: WC Pay built these bytes, has already committed
   * to `txID`, and broadcasts the result itself. `raw_data_hex` is therefore opaque —
   * refreshing the expiration, re-deriving the TAPOS ref block, adjusting `fee_limit`
   * or re-encoding `raw_data` all change the hash and get the payment rejected with
   * `tx_id_mismatch`. So this only verifies what it was given and signs it verbatim;
   * it deliberately does not go through `trx.sign`, which re-serializes `raw_data`
   * from JSON to cross-check it.
   */
  public signPaymentTransaction(transaction: TronUnsignedTransaction): TronSignedTransaction {
    const rawDataHex = transaction?.raw_data_hex
    if (!rawDataHex) {
      throw new Error('Missing raw_data_hex in Tron payment transaction')
    }
    if (!transaction.txID) {
      throw new Error('Missing txID in Tron payment transaction')
    }

    // `txID` is sha256(raw_data). Checking it here means a mismatch surfaces as a
    // readable wallet-side error instead of an opaque `tx_id_mismatch` at confirm.
    const digest = utils.crypto.SHA256(utils.code.hexStr2byteArray(rawDataHex))
    const computedTxID = utils.bytes.byteArray2hexStr(digest).toLowerCase()
    const expectedTxID = transaction.txID.replace(/^0x/, '').toLowerCase()

    if (computedTxID !== expectedTxID) {
      throw new Error(
        `Tron txID mismatch: sha256(raw_data_hex) is ${computedTxID} but the transaction declares ${expectedTxID}`
      )
    }

    this.assertTransactionOwner(transaction)

    // 65-byte recoverable signature (r ‖ s ‖ v) as 130 hex characters.
    const signature = utils.crypto.ECKeySign(digest, utils.code.hexStr2byteArray(this.privateKey))

    return { raw_data_hex: rawDataHex, signature: [signature] }
  }

  /**
   * Guards WC Pay's `owner_mismatch` rule: the transaction must spend from the
   * account the option was quoted against.
   */
  private assertTransactionOwner(transaction: TronUnsignedTransaction) {
    const owner = transaction.raw_data?.contract?.[0]?.parameter?.value?.owner_address

    if (!owner) {
      return
    }

    const address = this.getAddress() as string
    if (TronWeb.address.toHex(owner) !== TronWeb.address.toHex(address)) {
      throw new Error(
        `Tron transaction owner ${TronWeb.address.fromHex(owner)} does not match wallet ${address}`
      )
    }
  }

  /**
   * TRX balance in whole TRX. The buyer pays their own energy on Tron — there is no
   * fee payer and no fee bump — so WC Pay does not offer a Tron option to an account
   * holding less than `TRON_MIN_TRX_FOR_ENERGY`.
   */
  public async getTrxBalance() {
    const sun = await this.tronWeb.trx.getBalance(this.getAddress() as string)
    return Number(sun) / 1_000_000
  }
}
