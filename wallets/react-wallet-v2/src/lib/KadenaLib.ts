import { restoreKeyPairFromSecretKey, genKeyPair, sign } from '@kadena/cryptography-utils'

/**
 * Types
 */

// @TODO import from @kadena/types (?)
interface IPactInt {
  int: string
}
interface IPactDecimal {
  decimal: string
}
type PactLiteral = string | number | IPactInt | IPactDecimal | boolean
type PactValue = PactLiteral | Array<PactValue>
interface ICap {
  name: string
  args: Array<PactValue>
}
interface IKeyPair {
  publicKey: string
  secretKey?: string
  clist?: Array<ICap>
}

interface IInitArguments {
  secretKey?: string
}

/**
 * Library
 */
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

  // public signMessage(message: string) {

  //   const { signature } = sign(message,this.keyPair)

  //   return { signature }
  // }
}
