import { Transaction, TransactionComputer, Message, MessageComputer } from '@multiversx/sdk-core'
import { Mnemonic, UserSecretKey, UserWallet, UserSigner } from '@multiversx/sdk-wallet'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}

/**
 * Library
 */
export default class MultiversxLib {
  wallet: UserWallet
  mnemonic: Mnemonic
  password: string

  constructor(mnemonic: Mnemonic) {
    this.mnemonic = mnemonic
    this.password = 'password' // test purposes only

    this.wallet = UserWallet.fromMnemonic({
      password: this.password,
      mnemonic: mnemonic.toString()
    })
  }

  static init({ mnemonic }: IInitArgs) {
    const mnemonicObj = mnemonic ? Mnemonic.fromString(mnemonic) : Mnemonic.generate()

    return new MultiversxLib(mnemonicObj)
  }

  getMnemonic() {
    const secretKey = this.mnemonic.getWords().join(' ')

    return secretKey
  }

  getAddress() {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const address = secretKey.generatePublicKey().toAddress().bech32()

    return address
  }

  async signMessage(message: string) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()

    const messageObj = new Message({
      data: Buffer.from(message)
    })

    const messageComputer = new MessageComputer()
    const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
    const bytesToSign = messageComputer.computeBytesForSigning(messageObj)
    const signature = await signer.sign(Buffer.from(bytesToSign))

    return { signature: signature.toString('hex') }
  }

  async signTransaction(transaction: any) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()

    const txObj = Transaction.newFromPlainObject(transaction)
    const txComputer = new TransactionComputer()

    const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
    const bytesToSign = txComputer.computeBytesForSigning(txObj)
    const signature = await signer.sign(Buffer.from(bytesToSign))

    return { signature: signature.toString('hex') }
  }

  async signTransactions(transactions: any[]) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()
    const txComputer = new TransactionComputer()

    const signatures = await Promise.all(
      transactions.map(async (transaction: any): Promise<any> => {
        const txObj = Transaction.newFromPlainObject(transaction)
        const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
        const bytesToSign = txComputer.computeBytesForSigning(txObj)
        const signature = await signer.sign(Buffer.from(bytesToSign))

        return { signature: signature.toString('hex') }
      })
    )

    return { signatures }
  }
}
