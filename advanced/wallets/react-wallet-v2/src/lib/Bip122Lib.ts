import ECPairFactory from 'ecpair'
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39'
import BIP32Factory, { BIP32Interface } from 'bip32'
import bitcoinMessage from 'bitcoinjs-message'

const ECPair = ECPairFactory(ecc)
const bip32 = BIP32Factory(ecc)
interface IInitArguments {
  privateKey?: string
}

interface ICreateTransaction {
  network: bitcoin.Network
  recipientAddress: string
  amount: number
  changeAddress: string
  memo?: string
  utxos: any[]
  privateKeyWIF: string
  feeRate: number
}

interface IAddressData {
  address: string
  path: string
  publicKey: string
}

interface IPsbtInput {
  address: string
  index: number
  sighashTypes: number[]
}

interface ISignPsbt {
  account: string
  psbt: string
  signInputs: IPsbtInput[]
  broadcast: boolean
}

const validator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean => {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature)
}

/**
 * Library
 */
export default class Bip122Lib {
  private account: BIP32Interface
  private mnemonic: string
  private addresses = new Map<string, IAddressData>()
  private keys = new Map<string, { wif: string; network: bitcoin.Network }>()

  constructor(key?: string) {
    this.mnemonic = key ? key : bip39.generateMnemonic()
    const seed = bip39.mnemonicToSeedSync(this.mnemonic)
    const root = bip32.fromSeed(seed)
    this.account = bip32.fromBase58(root.toBase58())
    const addressIndex = (localStorage.getItem(`${seed}_index`) || 0) as number
    this.loadAddresses(addressIndex)
  }

  static async init({ privateKey }: IInitArguments) {
    return new Bip122Lib(privateKey)
  }

  public getAddress() {
    return Array.from(this.addresses.values())[0].address
  }

  public getPrivateKey() {
    return this.mnemonic
  }

  public getAddresses() {
    return this.addresses
  }

  public signMessage({
    message,
    address,
    protocol
  }: {
    message: string
    address: string
    protocol?: string
  }) {
    if (protocol && protocol !== 'ecdsa') {
      throw new Error(`Supported signing protols: ecdsa, received: ${protocol}`)
    }
    const addressData = this.addresses.get(address)
    if (!addressData) {
      throw new Error(`Unkown address: ${address}`)
    }
    const keyData = this.keys.get(address)!
    var keyPair = ECPair.fromWIF(keyData.wif)
    var privateKey = keyPair.privateKey!
    var signature = bitcoinMessage.sign(message, privateKey, keyPair.compressed, {
      segwitType: 'p2wpkh'
    })

    return {
      signature: signature.toString('hex').replace('0x', ''),
      address
    }
  }

  public async sendTransfer(params: {
    account: string
    recipientAddress: string
    amount: string
    changeAddress?: string
    memo?: string
  }) {
    const { account, recipientAddress, amount, changeAddress, memo } = params
    const satoshis = parseInt(amount)

    const addressData = this.addresses.get(account)
    if (!addressData) {
      throw new Error(`Unkown address: ${account}`)
    }

    if (satoshis < 0) {
      throw new Error(`Invalid amount: ${amount}`)
    }

    const utxos = await this.getUtXOs(account)
    if (!utxos || utxos.length === 0) {
      throw new Error(`No UTXOs found for address: ${account}`)
    }

    let utxosValue = 0
    const utxosToSpend: any[] = []
    utxos.forEach(utxo => {
      utxosValue += utxo.value
      utxosToSpend.push(utxo)
      if (utxosValue >= satoshis) {
        return
      }
    })

    const keyData = this.keys.get(account)!
    const transaction = await this.createTransaction({
      network: keyData.network,
      recipientAddress,
      amount: satoshis,
      changeAddress: changeAddress || account,
      utxos: utxosToSpend,
      privateKeyWIF: keyData.wif,
      memo,
      feeRate: await this.getFeeRate()
    })
    return await this.broadcastTransaction(transaction)
  }

  async getUtXOs(address: string): Promise<any[]> {
    // make chain dynamic
    return await (await fetch(`https://mempool.space/testnet/api/address/${address}/utxo`)).json()
  }

  async broadcastTransaction(transaction: string) {
    const result = await fetch(`https://mempool.space/testnet/api/tx`, {
      method: 'POST',
      body: transaction
    })

    if (result.ok) {
      return await result.text()
    }
    throw new Error('Error broadcasting transaction: ' + (await result.text()))
  }

  getAvailableBalance(utxos: any[]) {
    return utxos.reduce((acc, { value }) => acc + value, 0)
  }

  private async getFeeRate() {
    const defaultFeeRate = 2
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended')
      if (response.ok) {
        const data = await response.json()
        return parseInt(data?.economyFee ?? defaultFeeRate)
      }
    } catch (e) {
      console.error('Error fetching fee rate', e)
    }
    return defaultFeeRate
  }

  private generateAddress({
    index,
    network,
    change = false
  }: {
    index: number
    network: bitcoin.Network
    change?: boolean
  }) {
    const path = `m/84'/${network === bitcoin.networks.testnet ? '1' : '0'}'/0'/${
      change ? 1 : 0
    }/${index}`
    const child = this.account.derivePath(path)
    const address = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network
    }).address!
    const wif = child.toWIF()
    this.keys.set(address, { wif, network })
    return { address, path, publicKey: child.publicKey.toString('hex') }
  }

  private loadAddresses(startIndex = 0) {
    const addressesToLoad = startIndex + 20
    for (let i = startIndex; i < addressesToLoad; i++) {
      const addressData = this.generateAddress({ index: i, network: bitcoin.networks.testnet })
      this.addresses.set(addressData.address, addressData)
    }
  }

  private async createTransaction({
    network,
    recipientAddress,
    amount,
    changeAddress,
    memo,
    utxos,
    privateKeyWIF,
    feeRate
  }: ICreateTransaction) {
    const psbt = new bitcoin.Psbt({ network })
    const keyPair = ECPair.fromWIF(privateKeyWIF)
    const payment = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.testnet
    })

    utxos.forEach(utxo => {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(payment.output?.toString('hex')!, 'hex'),
          value: utxo.value
        }
      })
    })

    psbt.addOutput({
      address: recipientAddress,
      value: amount
    })
    const change = this.calculateChange(utxos, amount, feeRate)

    if (change > 0) {
      psbt.addOutput({
        address: changeAddress,
        value: change
      })
    }

    if (memo) {
      const data = Buffer.from(memo, 'utf8')
      const embed = bitcoin.payments.embed({ data: [data] })
      psbt.addOutput({
        script: embed.output!,
        value: 0
      })
    }

    psbt.signAllInputs(keyPair)

    psbt.validateSignaturesOfInput(0, validator)

    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction()

    return tx.toHex()
  }

  public async signPsbt({ account, psbt, signInputs, broadcast = false }: ISignPsbt) {
    const keyData = this.keys.get(account)!
    const keyPair = ECPair.fromWIF(keyData.wif)
    const transaction = bitcoin.Psbt.fromBase64(psbt, { network: keyData.network })
    signInputs.forEach(({ address, index, sighashTypes }) => {
      let keyPairToSignWith = keyPair
      if (address !== account) {
        const keyData = this.keys.get(address)!
        keyPairToSignWith = ECPair.fromWIF(keyData.wif)
      }
      transaction.signInput(index, keyPairToSignWith, sighashTypes)
    })
    transaction.validateSignaturesOfInput(0, validator)
    transaction.finalizeAllInputs()

    if (!broadcast) {
      return {
        psbt: transaction.toBase64()
      }
    }

    const tx = transaction.extractTransaction()
    const txId = await this.broadcastTransaction(tx.toHex())
    return {
      psbt: transaction.toBase64(),
      txid: txId
    }
  }

  // Helper function to calculate change
  private calculateChange(utxos: any[], amount: number, feeRate: number): number {
    const inputSum = utxos.reduce((sum, utxo) => sum + utxo.value, 0)
    const estimatedSize = 10 + 148 * utxos.length + 34 * 2
    const fee = estimatedSize * feeRate
    const change = inputSum - amount - fee
    return change
  }
}
