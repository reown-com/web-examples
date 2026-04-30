import nacl from 'tweetnacl'

interface IInitArgs {
  privateKey?: Uint8Array
}

export default class CantonLib {
  private keyPair: nacl.SignKeyPair

  constructor(keyPair: nacl.SignKeyPair) {
    this.keyPair = keyPair
  }

  static init({ privateKey }: IInitArgs) {
    const keyPair = privateKey
      ? nacl.sign.keyPair.fromSecretKey(privateKey)
      : nacl.sign.keyPair()

    return new CantonLib(keyPair)
  }

  getPublicKey(): string {
    return Buffer.from(this.keyPair.publicKey).toString('base64')
  }

  getPublicKeyHex(): string {
    return Buffer.from(this.keyPair.publicKey).toString('hex')
  }

  getSecretKey(): Uint8Array {
    return this.keyPair.secretKey
  }

  getSecretKeyBase64(): string {
    return Buffer.from(this.keyPair.secretKey).toString('base64')
  }

  getPartyId(): string {
    const namespace = '1220' + this.getPublicKeyHex()
    return `operator::${namespace}`
  }

  getNamespace(): string {
    return '1220' + this.getPublicKeyHex()
  }

  signMessage(message: string): string {
    const msgBytes = new TextEncoder().encode(message)
    const signature = nacl.sign.detached(msgBytes, this.keyPair.secretKey)
    return Buffer.from(signature).toString('base64')
  }

  signHash(hashHex: string): string {
    const hashBytes = Buffer.from(hashHex, 'hex')
    const signature = nacl.sign.detached(hashBytes, this.keyPair.secretKey)
    return Buffer.from(signature).toString('base64')
  }
}
