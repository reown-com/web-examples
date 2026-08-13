import {
  authorizeEntry,
  hash,
  Keypair,
  Networks,
  TransactionBuilder,
  xdr
} from '@stellar/stellar-base'

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
   * Resolves the Stellar network passphrase from a CAIP-2 chain id. The passphrase
   * is bound from the session's chain — never trusted from the request payload — as
   * required by the Stellar WalletConnect signing semantics.
   */
  private getNetworkPassphrase(chainId: string): string {
    const networkPassphrase = STELLAR_NETWORK_PASSPHRASES[chainId]

    if (!networkPassphrase) {
      throw new Error(`Unsupported Stellar chain: ${chainId}`)
    }

    return networkPassphrase
  }

  /**
   * Signs a transaction envelope XDR (base64) and returns the fully signed envelope XDR.
   * @param xdr base64-encoded transaction envelope
   * @param chainId CAIP-2 chain id, e.g. `stellar:pubnet`
   */
  public signXDR(xdr: string, chainId: string): string {
    const networkPassphrase = this.getNetworkPassphrase(chainId)

    const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase)
    transaction.sign(this.keypair)

    return transaction.toXDR()
  }

  /**
   * Signs a transaction envelope and submits it to the chain's Horizon endpoint.
   * @param xdr base64-encoded transaction envelope
   * @param chainId CAIP-2 chain id, e.g. `stellar:pubnet`
   * @param rpcUrl Horizon base URL for the chain
   * @param waitForInclusion when true, reports whether the tx landed successfully
   */
  public async signAndSubmitXDR(
    xdr: string,
    chainId: string,
    rpcUrl: string,
    waitForInclusion = false
  ): Promise<{ tx_hash: string; signedXDR: string; successful?: boolean }> {
    if (!rpcUrl) {
      throw new Error(`No Horizon RPC configured for chain: ${chainId}`)
    }

    const networkPassphrase = this.getNetworkPassphrase(chainId)
    const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase)
    transaction.sign(this.keypair)

    const signedXDR = transaction.toXDR()
    const txHash = transaction.hash().toString('hex')

    const response = await fetch(`${rpcUrl.replace(/\/$/, '')}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tx: signedXDR }).toString()
    })
    const result = await response.json()

    if (!response.ok) {
      const codes = result?.extras?.result_codes
      throw new Error(
        codes ? JSON.stringify(codes) : result?.detail || 'Failed to submit Stellar transaction'
      )
    }

    return {
      tx_hash: result?.hash ?? txHash,
      signedXDR,
      ...(waitForInclusion ? { successful: result?.successful ?? true } : {})
    }
  }

  /**
   * Signs an arbitrary message under the account's Ed25519 key following SEP-53:
   *   sign(Ed25519, sha256("Stellar Signed Message:\n" || message))
   * The domain-separating prefix is concatenated directly with the message bytes
   * (no separator byte) so a signed message can never collide with a transaction
   * body while staying interoperable with SEP-53-compliant wallets and SDKs.
   * @returns base64-encoded 64-byte Ed25519 signature
   */
  public signMessage(message: string, messageEncoding: 'utf-8' | 'base64' = 'utf-8'): string {
    const messageBytes =
      messageEncoding === 'base64'
        ? Buffer.from(message, 'base64')
        : Buffer.from(message, 'utf-8')

    const payload = hash(
      Buffer.concat([Buffer.from('Stellar Signed Message:\n', 'utf-8'), messageBytes])
    )

    return this.keypair.sign(payload).toString('base64')
  }

  /**
   * Signs a Soroban `SorobanAuthorizationEntry` (address credentials), populating
   * its signature SCVal. The network id is bound from the session chain.
   * @param authEntry base64-encoded unsigned SorobanAuthorizationEntry
   * @param chainId CAIP-2 chain id, e.g. `stellar:pubnet`
   * @returns base64-encoded signed SorobanAuthorizationEntry
   */
  public async signAuthEntry(authEntry: string, chainId: string): Promise<string> {
    const networkPassphrase = this.getNetworkPassphrase(chainId)
    const entry = xdr.SorobanAuthorizationEntry.fromXDR(authEntry, 'base64')

    if (
      entry.credentials().switch() !== xdr.SorobanCredentialsType.sorobanCredentialsAddress()
    ) {
      throw new Error('Only SOROBAN_CREDENTIALS_ADDRESS auth entries are signable')
    }

    // Preserve the entry's existing expiration ledger so all fields but the
    // signature stay byte-identical to the input.
    const validUntilLedgerSeq = entry.credentials().address().signatureExpirationLedger()

    const signedEntry = await authorizeEntry(
      entry,
      this.keypair,
      validUntilLedgerSeq,
      networkPassphrase
    )

    return signedEntry.toXDR('base64')
  }
}
