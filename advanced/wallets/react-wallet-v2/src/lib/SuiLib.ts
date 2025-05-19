import * as bip39 from 'bip39'
import { mnemonicToSeedSync } from 'bip39'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { verifyPersonalMessageSignature, verifySignature } from '@mysten/sui/verify'
import { derivePath } from 'ed25519-hd-key'

interface IInitArguments {
  mnemonic?: string
}

const SUI_PATH = "m/44'/784'/0'/0'/0'"

/**
 * Library
 */
export default class SuiLib {
  private keypair: Ed25519Keypair
  private mnemonic: string
  private address: string

  constructor(mnemonic?: string) {
    this.mnemonic = mnemonic ? mnemonic : bip39.generateMnemonic()
    const seed = mnemonicToSeedSync(this.mnemonic)
    const { key } = derivePath(SUI_PATH, seed.toString('hex'))

    this.keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(key))
    this.address = this.keypair.getPublicKey().toSuiAddress()
    console.log('Sui Address:', this.address)
  }

  static async init({ mnemonic }: IInitArguments) {
    return new SuiLib(mnemonic)
  }

  public getAddress() {
    return this.address
  }

  // public getOrdinalsAddress(chainId: IBip122ChainId) {
  //   return Array.from(this.ordinals[chainId].values())[0].address
  // }
  public getMnemonic() {
    return this.mnemonic
  }

  // public getAddresses(chainId: IBip122ChainId, intentions?: string[]) {
  //   if (intentions && intentions[0] === 'ordinal') {
  //     return this.ordinals[chainId]
  //   }
  //   return this.addresses[chainId]
  // }

  public async signMessage({ message }: { message: string }) {
    // Message to sign
    const messageToSign = new TextEncoder().encode(message)

    // Sign the message
    const signature = await this.keypair.signPersonalMessage(messageToSign)

    const base64Signature = Buffer.from(signature.signature).toString('base64')
    // Output
    console.log('Signature (base64):', base64Signature)
    console.log('Public Key:', this.keypair.getPublicKey().toBase64())

    const verified = await verifyPersonalMessageSignature(messageToSign, signature.signature)
    console.log('Verified:', verified, verified.equals(this.keypair.getPublicKey()))

    return {
      signature: base64Signature,
      publicKey: this.keypair.getPublicKey().toBase64()
    }
  }

  // public async sendTransfer(params: {
  //   account: string
  //   recipientAddress: string
  //   amount: string
  //   changeAddress?: string
  //   memo?: string
  //   chainId: IBip122ChainId
  // }) {
  //   const { account, recipientAddress, amount, changeAddress, memo, chainId } = params
  //   const satoshis = parseInt(amount)

  //   const addressData = this.getAddressData(account, chainId)
  //   if (!addressData) {
  //     throw new Error(`Unkown address: ${account}`)
  //   }

  //   if (satoshis < 0) {
  //     throw new Error(`Invalid amount: ${amount}`)
  //   }

  //   const utxos = (await this.getUTXOs(account, chainId)) as IUTXO[]
  //   if (!utxos || utxos.length === 0) {
  //     throw new Error(`No UTXOs found for address: ${account}`)
  //   }

  //   let utxosValue = 0
  //   const utxosToSpend: IUTXO[] = []
  //   utxos.forEach(utxo => {
  //     utxosValue += utxo.value
  //     utxosToSpend.push(utxo)
  //     if (utxosValue >= satoshis) {
  //       return
  //     }
  //   })

  //   const keyData = this.keys[chainId].get(account)!
  //   const transaction = await this.createTransaction({
  //     network: keyData.network,
  //     recipientAddress,
  //     amount: satoshis,
  //     changeAddress: changeAddress || account,
  //     utxos: utxosToSpend,
  //     privateKeyWIF: keyData.wif,
  //     memo,
  //     feeRate: await this.getFeeRate()
  //   })
  //   return await this.broadcastTransaction(transaction, chainId)
  // }

  // async getUTXOs(address: string, chainId: IBip122ChainId): Promise<IUTXO[]> {
  //   const isTestnet = this.isTestnet(chainId)
  //   // make chain dynamic
  //   return await (
  //     await fetch(`https://mempool.space${isTestnet ? '/testnet' : ''}/api/address/${address}/utxo`)
  //   ).json()
  // }

  // async broadcastTransaction(transaction: string, chainId: IBip122ChainId) {
  //   const isTestnet = this.isTestnet(chainId)
  //   const result = await fetch(`https://mempool.space${isTestnet ? '/testnet' : ''}/api/tx`, {
  //     method: 'POST',
  //     body: transaction
  //   })

  //   if (result.ok) {
  //     return await result.text()
  //   }
  //   throw new Error('Error broadcasting transaction: ' + (await result.text()))
  // }

  // getAvailableBalance(utxos: IUTXO[]) {
  //   return utxos.reduce((acc, { value }) => acc + value, 0)
  // }

  // private async getFeeRate() {
  //   const defaultFeeRate = 2
  //   try {
  //     const response = await fetch('https://mempool.space/api/v1/fees/recommended')
  //     if (response.ok) {
  //       const data = await response.json()
  //       return parseInt(data?.economyFee ?? defaultFeeRate)
  //     }
  //   } catch (e) {
  //     console.error('Error fetching fee rate', e)
  //   }
  //   return defaultFeeRate
  // }

  // private generateAddress({
  //   index,
  //   coinType,
  //   chainId,
  //   change = false,
  //   taproot = false
  // }: {
  //   index: number
  //   coinType: string
  //   chainId: IBip122ChainId
  //   change?: boolean
  //   taproot?: boolean
  // }) {
  //   const network = this.getNetwork(coinType)
  //   const path = `m/84'/${coinType}'/0'/${change ? 1 : 0}/${index}`
  //   const child = this.account.derivePath(path)
  //   let address
  //   if (taproot) {
  //     address = bitcoin.payments.p2tr({
  //       pubkey: child.publicKey.slice(1),
  //       network
  //     }).address!
  //   } else {
  //     address = bitcoin.payments.p2wpkh({
  //       pubkey: child.publicKey,
  //       network
  //     }).address!
  //   }
  //   const wif = child.toWIF()
  //   this.keys[chainId].set(address, { wif, network })
  //   return { address, path, publicKey: child.publicKey.toString('hex') }
  // }

  // private loadAddresses(startIndex = 0) {
  //   console.log('Loading addresses...')
  //   console.log('Keys:', this.keys)
  //   console.log('Addresses:', this.addresses)
  //   console.log('Ordinals:', this.ordinals)
  //   Object.keys(this.keys).forEach(chainId => {
  //     const data = BIP122_CHAINS[chainId as IBip122ChainId]
  //     const addressesToLoad = startIndex + 20

  //     for (let i = startIndex; i < addressesToLoad; i++) {
  //       const addressParams = {
  //         index: i,
  //         chainId: data.caip2,
  //         coinType: data.coinType
  //       }
  //       // payment addresses
  //       const addressData = this.generateAddress(addressParams)
  //       this.addresses[data.caip2].set(addressData.address, addressData)
  //       // ordinals
  //       const taprootAddress = this.generateAddress({
  //         ...addressParams,
  //         taproot: true
  //       })
  //       this.ordinals[data.caip2].set(taprootAddress.address, taprootAddress)
  //     }
  //     console.log('Loaded addresses:', this.addresses, this.ordinals)
  //   })
  // }

  // private getNetwork(coinType: string) {
  //   if (coinType === '0') {
  //     return bitcoin.networks.bitcoin
  //   } else if (coinType === '1') {
  //     return bitcoin.networks.testnet
  //   }
  //   throw new Error(`Unsupported coin type: ${coinType}`)
  // }

  // private async createTransaction({
  //   network,
  //   recipientAddress,
  //   amount,
  //   changeAddress,
  //   memo,
  //   utxos,
  //   privateKeyWIF,
  //   feeRate
  // }: ICreateTransaction) {
  //   const psbt = new bitcoin.Psbt({ network })
  //   const keyPair = ECPair.fromWIF(privateKeyWIF)
  //   const payment = bitcoin.payments.p2wpkh({
  //     pubkey: keyPair.publicKey,
  //     network: bitcoin.networks.testnet
  //   })

  //   utxos.forEach(utxo => {
  //     psbt.addInput({
  //       hash: utxo.txid,
  //       index: utxo.vout,
  //       witnessUtxo: {
  //         script: Buffer.from(payment.output?.toString('hex')!, 'hex'),
  //         value: utxo.value
  //       }
  //     })
  //   })

  //   psbt.addOutput({
  //     address: recipientAddress,
  //     value: amount
  //   })
  //   const change = this.calculateChange(utxos, amount, feeRate)

  //   if (change > 0) {
  //     psbt.addOutput({
  //       address: changeAddress,
  //       value: change
  //     })
  //   }

  //   if (memo) {
  //     const data = Buffer.from(memo, 'utf8')
  //     const embed = bitcoin.payments.embed({ data: [data] })
  //     psbt.addOutput({
  //       script: embed.output!,
  //       value: 0
  //     })
  //   }

  //   psbt.signAllInputs(keyPair)

  //   psbt.validateSignaturesOfInput(0, validator)

  //   psbt.finalizeAllInputs()

  //   const tx = psbt.extractTransaction()

  //   return tx.toHex()
  // }

  // public async signPsbt({ account, psbt, signInputs, broadcast = false, chainId }: ISignPsbt) {
  //   const keyData = this.keys[chainId].get(account)!
  //   const keyPair = ECPair.fromWIF(keyData.wif)
  //   const transaction = bitcoin.Psbt.fromBase64(psbt, { network: keyData.network })
  //   signInputs.forEach(({ address, index, sighashTypes }) => {
  //     let keyPairToSignWith = keyPair
  //     if (address !== account) {
  //       const keyData = this.keys[chainId].get(address)!
  //       keyPairToSignWith = ECPair.fromWIF(keyData.wif)
  //     }
  //     transaction.signInput(index, keyPairToSignWith, sighashTypes)
  //   })
  //   transaction.validateSignaturesOfInput(0, validator)
  //   transaction.finalizeAllInputs()

  //   if (!broadcast) {
  //     return {
  //       psbt: transaction.toBase64()
  //     }
  //   }

  //   const tx = transaction.extractTransaction()
  //   const txId = await this.broadcastTransaction(tx.toHex(), chainId)
  //   return {
  //     psbt: transaction.toBase64(),
  //     txid: txId
  //   }
  // }

  // // Helper function to calculate change
  // private calculateChange(utxos: IUTXO[], amount: number, feeRate: number): number {
  //   const inputSum = utxos.reduce((sum, utxo) => sum + utxo.value, 0)
  //   /**
  //    * 10 bytes: This is an estimated fixed overhead for the transaction.
  //    * 148 bytes: This is the average size of each input (UTXO).
  //    * 34 bytes: This is the size of each output.
  //    * The multiplication by 2 indicates that there are usually two outputs in a typical transaction (one for the recipient and one for change)
  //    */
  //   const estimatedSize = 10 + 148 * utxos.length + 34 * 2
  //   const fee = estimatedSize * feeRate
  //   const change = inputSum - amount - fee
  //   return change
  // }

  // private getAddressData(address: string, chainId: IBip122ChainId) {
  //   const addressData = this.addresses[chainId].get(address)
  //   if (addressData) return addressData
  //   return this.ordinals[chainId].get(address)
  // }

  // private isOrdinal(address: string, chainId: IBip122ChainId) {
  //   return this.ordinals[chainId].has(address)
  // }

  // private isTestnet(chainId: IBip122ChainId) {
  //   return chainId.includes(BIP122_TESTNET_ID)
  // }
}
