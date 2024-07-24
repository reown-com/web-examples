import { TezosToolkit } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import { localForger } from '@taquito/local-forging'
import { validateAddress } from '@taquito/utils';

import { Wallet } from 'ethers/'

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/1729'/0'/0'"
const DEFAULT_CURVE = 'ed25519'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
  curve?: 'ed25519' | 'secp256k1'
}

/**
 * Library
 */
export default class TezosLib {
  tezos: TezosToolkit
  signer: InMemorySigner
  mnemonic: string
  secretKey: string
  publicKey: string
  address: string
  curve: 'ed25519' | 'secp256k1'

  constructor(
    tezos: TezosToolkit,
    mnemonic: string,
    signer: InMemorySigner,
    secretKey: string,
    publicKey: string,
    address: string,
    curve: 'ed25519' | 'secp256k1'
  ) {
    this.tezos = tezos
    this.mnemonic = mnemonic
    this.signer = signer
    this.secretKey = secretKey
    this.publicKey = publicKey
    this.address = address
    this.curve = curve
  }

  static async init({ mnemonic, path, curve }: IInitArguments) {
    const params = {
      mnemonic: mnemonic ?? Wallet.createRandom().mnemonic.phrase,
      derivationPath: path ?? DEFAULT_PATH,
      curve: curve ?? DEFAULT_CURVE
    }

    // TODO: https://github.com/trilitech/web-examples/issues/2
    // Hardcoded Tezos to use testnet
    // Tezos should be able to switch between testnets and mainnet
    const Tezos = new TezosToolkit('https://rpc.ghostnet.teztnets.com')

    const signer = InMemorySigner.fromMnemonic(params)

    Tezos.setSignerProvider(signer)

    const secretKey = await signer.secretKey()
    const publicKey = await signer.publicKey()
    const address = await signer.publicKeyHash()

    return new TezosLib(Tezos, params.mnemonic, signer, secretKey, publicKey, address, params.curve)
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public getPublicKey() {
    return this.publicKey
  }

  public getCurve() {
    return this.curve
  }

  public getAddress() {
    return this.address
  }

  public async signTransaction(transaction: any) {
    // Map the transactions and prepare the batch
    console.log(`Wallet: handling transaction: `, transaction);

    const batchTransactions = transaction.map((tx: any) => {
      switch (tx.kind) {
        case 'transaction':
          if (!tx.amount || isNaN(tx.amount)) {
            throw new Error(`tx.amount is not a number: ${tx.amount}`);
          }
          if (!tx.destination || validateAddress(tx.destination) !== 3) {
            throw new Error(`tx.destination contains invalid address ${tx.destination}`);
          }
          return {
            kind: 'transaction',
            amount: tx.amount,
            to: tx.destination,
            mutez: tx.mutez ?? false,
          };
        case 'origination':
          if (!tx.source || validateAddress(tx.source) !== 3) {
            throw new Error(`tx.source contains invalid address ${tx.source}`);
          }
          if (!tx.balance || isNaN(tx.balance)) {
            throw new Error(`tx.balance is not a number: ${tx.balance}`);
          }
          if (!tx.code) {
            throw new Error(`tx.code is not defined: ${tx.code}`);
          }
          if (!tx.init) {
            throw new Error(`tx.init is not defined: ${tx.init}`);
          }
          return {
            kind: 'origination',
            source: tx.source,
            balance: tx.balance,
            code: tx.code,
            init: tx.init,
          };
        case 'delegation':
          if (!tx.source || validateAddress(tx.source) !== 3) {
            throw new Error(`tx.source contains invalid address ${tx.source}`);
          }
          if (!tx.delegate || validateAddress(tx.delegate) !== 3) {
            throw new Error(`tx.delegate contains invalid address ${tx.delegate}`);
          }
          return {
            kind: 'delegation',
            source: tx.source,
            delegate: tx.delegate,
          };
        default:
          throw new Error(`Unsupported transaction kind: ${tx.kind}`);
      }
    });

    // Prepare the batch
    console.log(`Wallet: prepared batchTransactions `, batchTransactions);
    const batch = this.tezos.contract.batch(batchTransactions);

    // Send the batch and wait for the operation hash
    console.log(`Wallet: sending batch `, batch);
    const operation = await batch.send();

    // Wait for confirmation
    await operation.confirmation();

    console.log('Wallet: operation confirmed.');
    return operation.hash;
  }

  public async signPayload(payload: any) {
    return await this.signer.sign(payload)
  }
}
