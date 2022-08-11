import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'
import { stringToU8a, u8aToHex, hexToU8a } from '@polkadot/util'
import { HexString } from '@polkadot/util/types'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
}

/**
 * Library
 */
export default class PolkadotLib {
  keypair: KeyringPair
  mnemonic: string

  constructor(keypair: KeyringPair, mnemonic: string) {
    this.keypair = keypair
    this.mnemonic = mnemonic
  }

  static async init({ mnemonic }: IInitArguments) {
    // wait till  WASM is initialized, in case it is not initialized already (WASM is required for 'sr25519').
    await cryptoWaitReady()

    // create a keyring to load the account.
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 1 })

    mnemonic = mnemonic || mnemonicGenerate()
    const keypair = keyring.createFromUri(mnemonic)

    return new PolkadotLib(keypair, mnemonic)
  }

  public getAddress() {
    return this.keypair.address
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public async signMessage(message: string) {
    // create the message, actual signature and verify
    const messageU8a = stringToU8a(message)
    const sigU8a = this.keypair.sign(messageU8a)
    const signature = u8aToHex(sigU8a)
    return { signature }
  }

  public async signTransaction(payload: HexString) {
    const sigU8a = this.keypair.sign(hexToU8a(payload), { withType: true })
    const signature = u8aToHex(sigU8a)
    return { payload, signature }
  }
}
