import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'
import { stringToU8a, u8aToHex } from '@polkadot/util'

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
    const sigHexStr = u8aToHex(sigU8a)
    const signature = { signature: sigHexStr }
    console.log(signature)
    return signature
  }

  /*public async signTransaction(
    feePayer: SolanaSignTransaction['feePayer'],
    recentBlockhash: SolanaSignTransaction['recentBlockhash'],
    instructions: SolanaSignTransaction['instructions'],
    partialSignatures?: SolanaSignTransaction['partialSignatures']
  ) {
    const { signature } = await this.solanaWallet.signTransaction(feePayer, {
      feePayer,
      instructions,
      recentBlockhash,
      partialSignatures: partialSignatures ?? []
    })

    return { signature }
  }*/
}
