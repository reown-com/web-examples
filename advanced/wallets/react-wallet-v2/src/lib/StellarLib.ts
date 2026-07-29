import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-base'

/**
 * Types
 */
interface IInitArguments {
  /** Strkey-encoded secret, e.g. `SB...` */
  secret?: string
}

export const STELLAR_CAIP_CHAINS = {
  pubnet: 'stellar:pubnet',
  testnet: 'stellar:testnet'
}
/**
 * CAIP-2 chain id -> Stellar network passphrase
 */
export const STELLAR_NETWORK_PASSPHRASES: Record<string, string> = {
  [STELLAR_CAIP_CHAINS.pubnet]: Networks.PUBLIC,
  [STELLAR_CAIP_CHAINS.testnet]: Networks.TESTNET
}

/**
 * Library
 */
export default class StellarLib {
  keypair: Keypair

  constructor(keypair: Keypair) {
    this.keypair = keypair
  }

  static init({ secret }: IInitArguments) {
    const keypair = secret ? Keypair.fromSecret(secret) : Keypair.random()

    return new StellarLib(keypair)
  }

  public getAddress() {
    return this.keypair.publicKey()
  }

  public getSecret() {
    return this.keypair.secret()
  }

  /**
   * Signs a transaction envelope XDR (base64) and returns the fully signed envelope XDR.
   * @param xdr base64-encoded transaction envelope
   * @param chainId CAIP-2 chain id, e.g. `stellar:pubnet`
   */
  public signXDR(xdr: string, chainId: string): string {
    const networkPassphrase = STELLAR_NETWORK_PASSPHRASES[chainId]

    if (!networkPassphrase) {
      throw new Error(`Unsupported Stellar chain: ${chainId}`)
    }

    const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase)
    transaction.sign(this.keypair)

    return transaction.toXDR()
  }
}
