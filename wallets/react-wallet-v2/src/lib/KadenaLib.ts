import { restoreKeyPairFromSecretKey, genKeyPair, sign } from '@kadena/cryptography-utils'
import { IKeyPair } from '@kadena/types'

interface IInitArguments {
  secretKey?: string
}

export default class KadenaLib {
  keyPair: IKeyPair

  constructor(keyPair: IKeyPair) {
    this.keyPair = keyPair
  }

  static init({ secretKey }: IInitArguments) {
    const keyPair = secretKey ? restoreKeyPairFromSecretKey(secretKey) : genKeyPair()

    return new KadenaLib(keyPair)
  }

  public getAddress() {
    return this.keyPair.publicKey
  }

  public getSecretKey() {
    return this.keyPair.secretKey!
  }

  public signRequest(message: string) {
    const signResponse = sign(message.toString(), this.keyPair)

    return { signature: signResponse.sig }
  }
}
