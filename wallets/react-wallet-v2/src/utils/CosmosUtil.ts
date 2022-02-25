import { bech32 } from 'bech32'
import BIP32Factory from 'bip32'
import * as bip39 from 'bip39'
// @ts-expect-error
import * as ecc from 'tiny-secp256k1'

/**
 * Helpers
 */
const bip32 = BIP32Factory(ecc)

/**
 * Types
 */
interface IConstructor {
  url?: string
  prefix?: string
  chainId?: string
  path?: string
  mnemonic?: string
}

/**
 * Utility
 */
export class Cosmos {
  url: string
  prefix: string
  chainId: string
  path: string
  mnemonic: string

  constructor({ url, prefix, chainId, path, mnemonic }: IConstructor) {
    this.url = url ?? 'https://api.cosmos.network'
    this.prefix = prefix ?? 'cosmos'
    this.chainId = chainId ?? 'cosmoshub-4'
    this.path = path ?? "m/44'/118'/0'/0/0"
    this.mnemonic = mnemonic ?? this.generateMnemonic()
  }

  generateMnemonic(strength = 128) {
    return bip39.generateMnemonic(strength)
  }

  async getAddress() {
    const seed = await bip39.mnemonicToSeed(this.mnemonic)
    const node = bip32.fromSeed(seed)
    const child = node.derivePath(this.path)
    const words = bech32.toWords(child.identifier)

    return bech32.encode(this.prefix, words)
  }
}
