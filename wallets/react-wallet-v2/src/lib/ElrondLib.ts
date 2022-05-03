import { Transaction, Mnemonic, UserSecretKey, UserWallet, UserSigner } from '@elrondnetwork/erdjs'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}

/**
 * Library
 */
export default class ElrondLib {
  wallet: UserWallet
  mnemonic: Mnemonic
  password: string

  constructor(mnemonic: Mnemonic) {
    this.mnemonic = mnemonic
    this.password = 'a1s2d3f4g5h6' // test purposes only

    const secretKey = mnemonic.deriveKey(0)
    const secretKeyHex = secretKey.hex()
    let fromHex = UserSecretKey.fromString(secretKeyHex)
    this.wallet = new UserWallet(fromHex, this.password)
  }

  static init({ mnemonic }: IInitArgs) {
    const mnemonicObj = mnemonic ? Mnemonic.fromString(mnemonic) : Mnemonic.generate()

    return new ElrondLib(mnemonicObj)
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

  signMessage(message: string) {
    //return this.wallet.signMessage(message)
  }

  async signTransaction(transaction: Transaction) {
    const secretKey = UserWallet.decryptSecretKey(this.wallet.toJSON(), this.password)
    const secretKeyHex = secretKey.hex()

    const signer = new UserSigner(UserSecretKey.fromString(secretKeyHex))
    await signer.sign(transaction)

    return transaction.getSignature().hex()
  }
}
