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

  public signRequest(transaction: string) {
    const signResponse = sign(transaction.toString(), this.keyPair)

    return { body: { cmd: transaction, sigs: [signResponse.sig] } }
  }

  public quicksignRequest(transactions: any) {
    const transaction = transactions.commandSigDatas[0].cmd
    const signResponse = sign(transaction.toString(), this.keyPair)

    return {
      responses: [
        {
          outcome: { result: 'success', hash: signResponse.hash },
          commandSigData: { sigs: [{ sig: signResponse.sig, pubKey: this.keyPair.publicKey }] }
        }
      ]
    }
  }
}
