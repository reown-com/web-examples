import { Transaction, SignableMessage } from '@multiversx/sdk-core'
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

    const signMessage = new SignableMessage({
      message: Buffer.from(message)
    })

    const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
    const signature = await signer.sign(signMessage.serializeForSigning())

    return { signature: signature.toString('hex') }
  }

  async signTransaction(transaction: any) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()

    const signTransaction = Transaction.fromPlainObject(transaction)

    const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
    const signature = await signer.sign(signTransaction.serializeForSigning())

    return { signature: signature.toString('hex') }
  }

  async signTransactions(transactions: any[]) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()

    const signatures = await Promise.all(
      transactions.map(async (transaction: any): Promise<any> => {
        const signTransaction = Transaction.fromPlainObject(transaction)
        const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
        const signature = await signer.sign(signTransaction.serializeForSigning())

        return { signature: signature.toString('hex') }
      })
    )

    return { signatures }
  }
}
