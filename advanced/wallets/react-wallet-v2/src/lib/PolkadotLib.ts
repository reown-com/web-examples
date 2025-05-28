import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'
import { u8aToHex } from '@polkadot/util'
import { SignerPayloadJSON } from '@polkadot/types/types'
import { WsProvider as PolkadotWsProvider } from '@polkadot/api'
import { ApiPromise } from '@polkadot/api'

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
    return {
      signature: u8aToHex(this.keypair.sign(message))
    }
  }

  public async signTransaction(payload: SignerPayloadJSON, chainId: string) {
    let rpcUrl = ''
    if (chainId === 'polkadot:91b171bb158e2d3848fa23a9f1c25182') {
      rpcUrl = 'wss://rpc.polkadot.io'
    } else if (chainId === 'polkadot:e143f23803ac50e8f6f8e62695d1ce9e') {
      rpcUrl = 'wss://westend-rpc.polkadot.io'
    } else {
      throw new Error(`Unsupported polkadot chainId: ${chainId}`)
    }
    console.log('payload', rpcUrl)
    const api = await ApiPromise.create({ provider: new PolkadotWsProvider(rpcUrl) })
    await api.isReady
    api.registry.setSignedExtensions(payload.signedExtensions)
    const txPayload = api.registry.createType('ExtrinsicPayload', payload, {
      version: payload.version
    })
    const { signature } = txPayload.sign(this.keypair)
    console.log('signature', signature)
    return { signature }
  }
}
